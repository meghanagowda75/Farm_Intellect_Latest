import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';
import { createSarvamChatCompletion } from './sarvam.js';
import { logger } from '../utils/logger.js';

const AI_UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'ai-images');

function resolveSafeImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') {
    throw new Error('Invalid image path');
  }

  const resolved = path.resolve(imagePath);
  const root = path.resolve(AI_UPLOADS_ROOT);

  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid image path');
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error('Image file not found');
  }

  return resolved;
}

function inconclusiveResult(source = 'inconclusive') {
  return {
    source,
    disease: 'Analysis Inconclusive',
    confidence: 0,
    severity: 'unknown',
    category: 'unknown',
    description:
      'The image or symptoms could not be analyzed reliably. Upload a clear image showing the affected plant part or consult a local agricultural expert.',
    symptomsDetected: [],
    treatment: {
      chemical: [],
      organic: [],
      cultural: ['Consult your local KVK or agricultural officer'],
    },
    prevention: [
      'Monitor the crop regularly',
      'Avoid applying pesticides without confirming the cause',
    ],
    yieldLossEstimate: 'Unknown',
    urgency: 'monitoring',
  };
}

function normalizeCrop(crop) {
  if (!crop || typeof crop !== 'string') return 'unknown';

  const value = crop.trim().toLowerCase();

  if (value === 'corn') return 'maize';

  return value || 'unknown';
}

function extractJson(content) {
  if (typeof content !== 'string') return null;

  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end <= start) return null;

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function validateDiagnosis(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  if (typeof data.disease !== 'string' || !data.disease.trim()) {
    return false;
  }

  const confidence = Number(data.confidence);

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    return false;
  }

  const allowedSeverity = ['low', 'medium', 'high', 'critical'];
  const allowedCategory = [
    'fungal',
    'bacterial',
    'viral',
    'nutrient',
    'pest',
    'healthy',
    'unknown',
  ];

  if (!allowedSeverity.includes(data.severity)) return false;
  if (!allowedCategory.includes(data.category)) return false;

  return true;
}

function safeStringArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function normalizeDiagnosis(data, source) {
  if (!validateDiagnosis(data)) {
    return inconclusiveResult(source);
  }

  const disease = data.disease.trim();

  if (/^(unknown|analysis inconclusive|cannot determine)$/i.test(disease)) {
    return inconclusiveResult(source);
  }

  const treatment = data.treatment || {};

  return {
    source,
    disease,
    confidence: Math.round(Number(data.confidence)),
    severity: data.severity,
    category: data.category,
    description:
      typeof data.description === 'string'
        ? data.description
        : 'The model returned a possible diagnosis. Confirm it with an agricultural expert.',
    symptomsDetected: safeStringArray(data.symptoms_detected),
    treatment: {
      chemical: safeStringArray(treatment.chemical),
      organic: safeStringArray(treatment.organic),
      cultural: safeStringArray(treatment.cultural),
    },
    prevention: safeStringArray(data.prevention),
    yieldLossEstimate:
      typeof data.yield_loss_estimate === 'string'
        ? data.yield_loss_estimate
        : 'Unknown',
    urgency: ['immediate', 'within_week', 'monitoring'].includes(data.urgency)
      ? data.urgency
      : 'monitoring',
  };
}

/**
 * Decode the uploaded image into RGB pixels.
 * Used for validation and color statistics.
 */
async function decodeImageToPixels(imagePath) {
  const safePath = resolveSafeImagePath(imagePath);

  const result = await sharp(safePath, {
    failOn: 'error',
    limitInputPixels: 40000000,
  })
    .rotate()
    .resize({
      width: 512,
      height: 512,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (
    result.info.channels !== 3 ||
    result.info.width < 2 ||
    result.info.height < 2
  ) {
    throw new Error('Unsupported or invalid image');
  }

  return {
    pixels: result.data,
    width: result.info.width,
    height: result.info.height,
  };
}

/**
 * Calculate basic color statistics.
 * These are not used as a disease classifier.
 */
function extractColorFeatures(pixels, width, height) {
  const total = width * height;
  let green = 0;
  let brown = 0;
  let yellow = 0;

  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    if (g > r * 1.2 && g > b * 1.2 && g > 60) {
      green++;
    }

    if (r > 80 && g > 40 && g < r * 0.8 && b < r * 0.5) {
      brown++;
    }

    if (r > 150 && g > 130 && b < 80 && Math.abs(r - g) < 40) {
      yellow++;
    }
  }

  return {
    greenRatio: +(green / total).toFixed(3),
    brownRatio: +(brown / total).toFixed(3),
    yellowRatio: +(yellow / total).toFixed(3),
  };
}

/**
 * Analyze a crop image using Gemini Vision.
 */
async function analyzeWithGeminiVision(imagePath, cropType) {
  const safePath = resolveSafeImagePath(imagePath);
  const { pixels, width, height } = await decodeImageToPixels(safePath);

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from the backend environment');
  }

  const metadata = await sharp(safePath).metadata();

  const mimeTypes = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  const mimeType = mimeTypes[metadata.format];

  if (!mimeType) {
    throw new Error('Unsupported image format');
  }

  const imageBuffer = await fs.promises.readFile(safePath);
  const base64Image = imageBuffer.toString('base64');
  const crop = normalizeCrop(cropType);

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const prompt = `
You are an agricultural plant-health assistant.

Analyze the attached image itself. Do not guess a disease based only on the crop name.

Crop hint: ${crop}

If the image does not clearly show a plant, is unclear, or does not provide
enough evidence to identify a condition, return:
- disease: "Analysis Inconclusive"
- confidence: 0
- severity: "low"
- category: "unknown"
- empty symptoms and treatment arrays

Do not claim that a disease is confirmed.
Do not invent symptoms, treatments, pesticide dosages, or yield-loss estimates.

Return only valid JSON with this exact structure:
{
  "disease": "disease name or Analysis Inconclusive",
  "confidence": 0,
  "severity": "low",
  "category": "fungal",
  "symptoms_detected": [],
  "description": "brief explanation based on visible evidence",
  "treatment": {
    "chemical": [],
    "organic": [],
    "cultural": []
  },
  "prevention": [],
  "yield_loss_estimate": "Unknown",
  "urgency": "monitoring"
}

Confidence must be a number from 0 to 100.
Severity must be one of: low, medium, high, critical.
Category must be one of: fungal, bacterial, viral, nutrient, pest, healthy, unknown.
Urgency must be one of: immediate, within_week, monitoring.
`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
    },
  });

  const parsed = extractJson(response.text);

  if (!parsed) {
    logger.warn('Gemini returned invalid image-diagnosis JSON');
    return {
      ...inconclusiveResult('gemini-vision'),
      imageFeatures: extractColorFeatures(pixels, width, height),
    };
  }

  const diagnosis = normalizeDiagnosis(parsed, 'gemini-vision');

  if (diagnosis.disease !== 'Analysis Inconclusive' && crop !== 'unknown') {
    diagnosis.description +=
      ' The crop identification and diagnosis should be confirmed before treatment.';
  }

  return {
    ...diagnosis,
    imageFeatures: extractColorFeatures(pixels, width, height),
  };
}

/**
 * Analyze an uploaded crop image.
 */
export async function detectDiseaseFromImage(imagePath, cropType) {
  try {
    await decodeImageToPixels(imagePath);

    return await analyzeWithGeminiVision(imagePath, cropType);
  } catch (error) {
    logger.error('Gemini image disease analysis failed', {
      message: error.message,
    });

    return inconclusiveResult('inconclusive');
  }
}

/**
 * Diagnose symptoms described by a farmer using Sarvam.
 */
export async function diagnoseDiseaseFromText(description, cropType) {
  if (typeof description !== 'string' || !description.trim()) {
    return inconclusiveResult('invalid-symptoms');
  }

  const crop = normalizeCrop(cropType);

  const systemPrompt = `
You are an agricultural plant-health assistant.

Use only the symptoms supplied by the farmer.
Do not guess a diagnosis from the crop name alone.
If the symptoms are insufficient, return "Analysis Inconclusive".
Do not invent symptoms, chemical dosages, or yield-loss estimates.

Return only valid JSON:
{
  "disease": "disease name or Analysis Inconclusive",
  "confidence": 0,
  "severity": "low",
  "category": "unknown",
  "description": "brief explanation",
  "symptoms_detected": [],
  "treatment": {
    "chemical": [],
    "organic": [],
    "cultural": []
  },
  "prevention": [],
  "yield_loss_estimate": "Unknown",
  "urgency": "monitoring"
}

Confidence must be 0-100.
Severity: low, medium, high, critical.
Category: fungal, bacterial, viral, nutrient, pest, healthy, unknown.
Urgency: immediate, within_week, monitoring.
`;

  try {
    const result = await createSarvamChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Crop: ${crop}\nFarmer's symptoms: ${description.trim()}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 700,
    });

    const parsed = extractJson(result.content);

    if (!parsed) {
      logger.warn('Sarvam returned invalid text-diagnosis JSON');
      return inconclusiveResult('sarvam-nlp-diagnosis');
    }

    return normalizeDiagnosis(parsed, 'sarvam-nlp-diagnosis');
  } catch (error) {
    logger.error('Text disease diagnosis failed', {
      message: error.message,
    });

    return inconclusiveResult('inconclusive');
  }
}