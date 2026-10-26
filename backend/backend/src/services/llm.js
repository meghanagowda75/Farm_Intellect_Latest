
const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

const getGeminiApiKey = () => {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error('GEMINI_API_KEY is missing from backend/.env');
  }

  return key;
};

export const createChatCompletion = async ({ messages }) => {
  const apiKey = getGeminiApiKey();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  const systemMessages = messages
    .filter((item) => item.role === 'system')
    .map((item) => item.content)
    .join('\n\n');

  const conversation = messages
    .filter((item) => item.role !== 'system')
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(item.content) }],
    }));

  if (conversation.length === 0) {
    throw new Error('At least one user message is required');
  }

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(systemMessages
          ? { systemInstruction: { parts: [{ text: systemMessages }] } }
          : {}),
        contents: conversation,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || 'Gemini API request failed';

    throw new Error(`Gemini API error (${response.status}): ${message}`);
  }

  const content = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!content) {
    throw new Error('Gemini returned an empty response');
  }

  return { content };
};