import { GoogleGenAI } from '@google/genai';

function extractJson(text) {
  const cleaned = text
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

export async function predictMarketPrice({ crop, days }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const prompt = `
You are an agricultural market analysis assistant.

Create an illustrative price estimate for the crop "${crop}" for the next ${days} days.

Important:
- You do not have verified live market prices or market data.
- Do not claim these are actual or official market prices.
- Do not invent historical prices or claim measured prediction accuracy.
- Return a reasonable illustrative estimate in Indian rupees per quintal.
- Clearly state that the result is an AI-generated estimate, not a guaranteed price.
- Provide one forecast point for each 7-day interval and include the final requested day.
- Keep the explanation brief.
- Do not give a BUY or SELL instruction.

Return only valid JSON in this format:
{
  "crop": "${crop}",
  "unit": "INR per quintal",
  "forecast": [
    { "day": 7, "price": 2500 }
  ],
  "factors": ["Illustrative factor"],
  "disclaimer": "AI-generated estimate, not verified live market data."
}
`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.2,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  });

  const result = extractJson(response.text);

  if (
    !result ||
    !Array.isArray(result.forecast) ||
    result.forecast.length === 0 ||
    result.forecast.some(
      point =>
        !Number.isInteger(point.day) ||
        point.day < 1 ||
        point.day > days ||
        !Number.isFinite(point.price) ||
        point.price <= 0
    )
  ) {
    throw new Error('Gemini returned an invalid price forecast');
  }

  return {
    crop,
    unit: 'INR per quintal',
    forecast: result.forecast,
    factors: Array.isArray(result.factors)
      ? result.factors.filter(item => typeof item === 'string').slice(0, 6)
      : [],
    disclaimer:
      'AI-generated estimate, not verified live market data. Actual prices may differ.',
    source: 'gemini',
  };
}
