/**
 * NLP Service
 * Uses Sarvam AI for NLP tasks and Gemini AI for crop calendar generation.
 */

import { createSarvamChatCompletion } from './sarvam.js';
import { createChatCompletion } from './llm.js';
import { logger } from '../utils/logger.js';

// ─── Forum Post Auto-Tagging ──────────────────────────────────────────────────

const FORUM_CATEGORIES = [
  'pest-management',
  'disease-diagnosis',
  'soil-health',
  'irrigation',
  'fertilizer',
  'government-scheme',
  'market-price',
  'organic-farming',
  'seed-selection',
  'harvest-technique',
  'weather-advisory',
  'equipment',
  'livestock',
  'general-discussion',
];

export async function classifyForumPost(title, body) {
  try {
    const result = await createSarvamChatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are an Indian agricultural text classifier.
Respond ONLY in JSON:
{
  "primary_category": "one of: ${FORUM_CATEGORIES.join(', ')}",
  "secondary_categories": [],
  "crops_mentioned": [],
  "urgency": "low|medium|high",
  "sentiment": "positive|neutral|negative|distressed",
  "language_detected": "en|hi|pa|ta|te|bn|mr|gu|kn|ml",
  "keywords": [],
  "suggested_experts": ["agronomist"]
}`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nBody: ${body}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 300,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return {
        source: 'sarvam-nlp',
        ...JSON.parse(jsonMatch[0]),
      };
    }
  } catch (err) {
    logger.warn('Sarvam classification unavailable:', err.message);
  }

  return keywordClassify(`${title} ${body}`);
}

function keywordClassify(text) {
  const lower = text.toLowerCase();

  const rules = [
    {
      keywords: ['pest', 'insect', 'worm', 'borer', 'aphid', 'whitefly', 'bollworm', 'armyworm', 'keet', 'kira'],
      category: 'pest-management',
    },
    {
      keywords: ['disease', 'blight', 'rust', 'mildew', 'rot', 'wilt', 'blast', 'spot', 'fungus', 'rog', 'bimari'],
      category: 'disease-diagnosis',
    },
    {
      keywords: ['soil', 'ph', 'nitrogen', 'phosphorus', 'potassium', 'organic carbon', 'mitti', 'bhumi'],
      category: 'soil-health',
    },
    {
      keywords: ['water', 'irrigation', 'drip', 'sprinkler', 'canal', 'paani', 'sinchai'],
      category: 'irrigation',
    },
    {
      keywords: ['fertilizer', 'urea', 'dap', 'npk', 'manure', 'compost', 'khad'],
      category: 'fertilizer',
    },
    {
      keywords: ['scheme', 'subsidy', 'pm-kisan', 'pmfby', 'kcc', 'yojana', 'sarkar'],
      category: 'government-scheme',
    },
    {
      keywords: ['price', 'mandi', 'msp', 'market', 'bazaar', 'rate', 'sell', 'bhav', 'daam'],
      category: 'market-price',
    },
    {
      keywords: ['organic', 'natural', 'jeevamrit', 'vermicompost', 'jaivik'],
      category: 'organic-farming',
    },
    {
      keywords: ['seed', 'variety', 'hybrid', 'bij', 'beej'],
      category: 'seed-selection',
    },
    {
      keywords: ['weather', 'rain', 'drought', 'hail', 'heat', 'mausam', 'barish'],
      category: 'weather-advisory',
    },
  ];

  const matches = rules
    .map((rule) => ({
      category: rule.category,
      score: rule.keywords.filter((word) => lower.includes(word)).length,
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    source: 'keyword-fallback',
    primary_category: matches[0]?.category || 'general-discussion',
    secondary_categories: matches.slice(1, 3).map((match) => match.category),
    crops_mentioned: [],
    urgency: 'medium',
    sentiment: 'neutral',
    language_detected: 'en',
    keywords: [],
    suggested_experts: ['agronomist'],
  };
}

// ─── Sentiment Analysis ───────────────────────────────────────────────────────

export async function analyzeSentiment(text) {
  try {
    const result = await createSarvamChatCompletion({
      messages: [
        {
          role: 'system',
          content: `Analyze the sentiment of this Indian farmer's message.
Respond ONLY in JSON:
{
  "sentiment": "positive|neutral|negative|distressed",
  "confidence": 0-100,
  "emotion": "happy|hopeful|neutral|worried|frustrated|desperate",
  "topics": [],
  "needs_attention": true,
  "summary": "one-line summary"
}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.1,
      maxTokens: 200,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    logger.warn('Sentiment analysis error:', err.message);
  }

  const lower = text.toLowerCase();

  const negative = [
    'problem', 'fail', 'loss', 'damage', 'die', 'dead',
    'help', 'urgent', 'nuksan', 'barbad', 'madad',
  ];

  const positive = [
    'good', 'great', 'harvest', 'profit', 'success',
    'happy', 'achha', 'fasal', 'munafa',
  ];

  const negCount = negative.filter((word) => lower.includes(word)).length;
  const posCount = positive.filter((word) => lower.includes(word)).length;

  return {
    sentiment:
      negCount > posCount
        ? 'negative'
        : posCount > negCount
          ? 'positive'
          : 'neutral',
    confidence: 55,
    emotion: negCount > 2 ? 'distressed' : 'neutral',
    needs_attention: negCount > 2,
    summary: 'Auto-classified based on keywords.',
  };
}

// ─── Document/Advisory Summarization ──────────────────────────────────────────

export async function summarizeAdvisory(text, targetLanguage = 'en') {
  try {
    const langInstruction =
      targetLanguage !== 'en'
        ? `Respond in language code: ${targetLanguage}.`
        : 'Respond in English.';

    const result = await createSarvamChatCompletion({
      messages: [
        {
          role: 'system',
          content: `Summarize this agricultural advisory for a farmer
in simple, actionable bullet points. ${langInstruction}
Respond in JSON:
{
  "title": "concise title",
  "summary": "2-3 sentence summary",
  "action_items": [],
  "urgency": "low|medium|high",
  "affected_crops": [],
  "valid_until": "date or duration"
}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.2,
      maxTokens: 400,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    logger.warn('Summarization error:', err.message);
  }

  return {
    title: 'Advisory Summary',
    summary: `${text.substring(0, 200)}...`,
    action_items: ['Read the full advisory for details'],
    urgency: 'medium',
  };
}

// ─── Government Scheme Matching ───────────────────────────────────────────────

export async function matchGovernmentSchemes({
  landHolding,
  cropType,
  state,
  category,
  income,
}) {
  try {
    const result = await createSarvamChatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are an expert on Indian agricultural government schemes
(PM-KISAN, PMFBY, KCC, Soil Health Card, PKVY, RKVY, eNAM, MIDH, NMSA,
PM-KUSUM, etc.).
List potentially eligible schemes based on the farmer's profile.
Respond ONLY in JSON:
{
  "eligible_schemes": [
    {
      "name": "scheme name",
      "hindi_name": "Hindi name",
      "benefit": "what the farmer gets",
      "eligibility": "why they qualify",
      "how_to_apply": "brief steps",
      "deadline": "if applicable"
    }
  ],
  "total_potential_benefit": "estimated annual benefit in ₹"
}`,
        },
        {
          role: 'user',
          content: `Farmer Profile:
Land: ${landHolding} acres
Crop: ${cropType}
State: ${state}
Category: ${category || 'General'}
Annual Income: ₹${income || 'Not specified'}`,
        },
      ],
      temperature: 0.2,
      maxTokens: 800,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    logger.warn('Scheme matching error:', err.message);
  }

  return {
    eligible_schemes: [
      {
        name: 'PM-KISAN',
        hindi_name: 'पीएम-किसान',
        benefit: '₹6,000/year in 3 installments',
        eligibility: 'Landholding farmers who meet scheme rules',
        how_to_apply: 'Apply at pmkisan.gov.in or nearest CSC center',
      },
      {
        name: 'Soil Health Card',
        hindi_name: 'मृदा स्वास्थ्य कार्ड',
        benefit: 'Free soil testing and recommendations',
        eligibility: 'Farmers eligible under the scheme',
        how_to_apply: 'Contact the nearest KVK or agriculture office',
      },
      {
        name: 'PMFBY',
        hindi_name: 'पीएम फसल बीमा',
        benefit: 'Crop insurance at subsidized premium',
        eligibility: 'Farmers and crops meeting current scheme rules',
        how_to_apply: 'Apply through an authorized channel before the applicable deadline',
      },
      {
        name: 'KCC',
        hindi_name: 'किसान क्रेडिट कार्ड',
        benefit: 'Crop credit subject to bank and scheme terms',
        eligibility: 'Farmers meeting bank and scheme requirements',
        how_to_apply: 'Contact a participating bank with required documents',
      },
    ],
    total_potential_benefit:
      'Benefits depend on current scheme rules and individual eligibility.',
  };
}

// ─── Crop Calendar Advisory (Gemini AI) ───────────────────────────────────────

export async function generateCropCalendar({
  cropType,
  location,
  soilType,
  sowingDate,
}) {
  if (!cropType || typeof cropType !== 'string') {
    return { error: 'A valid crop type is required.' };
  }

  try {
    const result = await createChatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are an agricultural advisory assistant familiar with
Indian farming practices.

Generate a practical crop calendar based on the crop, region, soil, and
planned sowing date.

Return ONLY valid JSON without Markdown fences or extra text.

Use this structure:
{
  "crop": "crop name",
  "location": "region",
  "total_duration_days": 120,
  "stages": [
    {
      "stage": "Land Preparation",
      "week": "Week 1",
      "activities": ["activity 1", "activity 2"],
      "inputs_needed": ["input 1"],
      "critical_notes": "important note"
    }
  ],
  "key_dates": {
    "sowing_window": "appropriate sowing window",
    "first_irrigation": "recommended timing",
    "harvest_window": "estimated harvest window"
  }
}

Include suitable stages from land preparation through harvest.
Adapt advice to the supplied crop, region, soil, and sowing date.
Do not invent exact dates if information is insufficient.
Recommend confirming fertilizer and pesticide use with local agricultural
experts or the nearest Krishi Vigyan Kendra.`,
        },
        {
          role: 'user',
          content: `Crop: ${cropType}
Location: ${location || 'Not specified'}
Soil type: ${soilType || 'Not specified'}
Planned sowing date: ${sowingDate || 'Current season'}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 1200,
    });

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Gemini did not return valid JSON.');
    }

    const calendar = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(calendar.stages)) {
      throw new Error('The generated crop calendar has no valid stages.');
    }

    return calendar;
  } catch (err) {
    logger.error('Gemini crop calendar generation failed:', err.message);

    return {
      error: 'Could not generate the crop calendar. Please try again.',
    };
  }
}