
import { logger } from '../utils/logger.js';

const getApiKey = () => process.env.GEMINI_API_KEY;
const getModel = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const getApiUrl = (model, stream = false) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const action = stream ? 'streamGenerateContent' : 'generateContent';
  const query = stream ? '&alt=sse' : '';

  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}${query}`;
};

const toGeminiContents = (messages) => {
  const systemParts = [];
  const contents = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content);
    } else {
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      });
    }
  }

  return {
    systemInstruction: systemParts.length
      ? { parts: [{ text: systemParts.join('\n\n') }] }
      : undefined,
    contents,
  };
};

const parseError = async (response) => {
  try {
    const data = await response.json();
    return data?.error?.message || JSON.stringify(data);
  } catch {
    return `Gemini request failed: ${response.status}`;
  }
};

// Normal Gemini chat completion
export const createChatCompletion = async ({
  messages,
  model = getModel(),
  temperature = 0.3,
  maxTokens = 700,
}) => {
  const url = getApiUrl(model);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...toGeminiContents(messages),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const details = await parseError(response);

    logger.error('Gemini API request failed', {
      status: response.status,
      details,
    });

    throw new Error(details);
  }

  const payload = await response.json();

  const content = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!content) {
    throw new Error('Gemini returned an empty chat response.');
  }

  return { content, raw: payload };
};

// Streaming Gemini chat completion
export const createChatCompletionStream = async ({
  messages,
  model = getModel(),
  temperature = 0.3,
  maxTokens = 700,
  onChunk,
}) => {
  const url = getApiUrl(model, true);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...toGeminiContents(messages),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const details = await parseError(response);

    logger.error('Gemini streaming request failed', {
      status: response.status,
      details,
    });

    throw new Error(details);
  }

  if (!onChunk || !response.body) {
    const payload = await response.json();

    const content = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!content) {
      throw new Error('Gemini returned an empty chat response.');
    }

    return { content, raw: payload };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let content = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;

        const dataStr = line.slice(5).trim();

        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const data = JSON.parse(dataStr);

          const chunk = data?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || '')
            .join('');

          if (chunk) {
            content += chunk;
            onChunk(chunk);
          }
        } catch {
          // Ignore incomplete streaming event data.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content: content.trim(),
    raw: { streaming: true },
  };
};

// Gemini audio transcription
export const transcribeAudioWithGemini = async ({
  buffer,
  mimeType = 'audio/wav',
  languageCode = 'en-IN',
}) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A valid audio buffer is required.');
  }

  const url = getApiUrl(getModel());

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                `Transcribe this audio accurately. ` +
                `The preferred language is ${languageCode}. ` +
                'Return only the spoken words as text. ' +
                'Do not answer questions contained in the audio.',
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: buffer.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!response.ok) {
    const details = await parseError(response);

    logger.error('Gemini audio transcription failed', {
      status: response.status,
      details,
    });

    throw new Error(details);
  }

  const payload = await response.json();

  const transcript = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!transcript) {
    throw new Error('Gemini returned an empty audio transcription.');
  }

  return {
    transcript,
    raw: payload,
  };
};
