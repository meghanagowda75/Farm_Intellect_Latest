
export type AiMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

import { apiBaseUrl } from "@/lib/api";

const CHAT_URL = `${apiBaseUrl}/api/chat/complete`;

type ChatMode =
  | "chat"
  | "disease"
  | "recommendation"
  | "yield"
  | "vision";

type StreamChatOptions = {
  messages: AiMessage[];
  mode?: ChatMode;
  language?: string;
  imageBase64?: string;
  imageMimeType?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
};

export async function streamChat({
  messages,
  mode = "chat",
  language = "en",
  imageBase64,
  imageMimeType,
  onDelta,
  onDone,
  onError,
}: StreamChatOptions): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      messages,
      mode: mode === "vision" ? "disease" : mode,
      languageCode: language,
    };

    if (imageBase64) {
      body.imageBase64 = imageBase64;
      body.imageMimeType = imageMimeType || "image/jpeg";
    }

    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;

      try {
        const payload = await response.json();

        if (payload && typeof payload.error === "string") {
          errorMessage = payload.error;
        }
      } catch {
        // Keep the default error message.
      }

      if (response.status === 403) {
        errorMessage = "You are not authorized to use this AI feature.";
      } else if (response.status === 429) {
        errorMessage = "Too many requests. Please wait a moment.";
      } else if (response.status >= 500) {
        errorMessage =
          "The AI backend encountered an error. Check the backend terminal.";
      }

      throw new Error(errorMessage);
    }

    const payload: { content?: unknown } = await response.json();

    if (
      typeof payload.content !== "string" ||
      !payload.content.trim()
    ) {
      throw new Error("The AI returned an empty response.");
    }

    onDelta(payload.content);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Connection failed. Please try again.";

    onError?.(message);
  } finally {
    onDone();
  }
}

/** Non-streaming AI call */
export async function invokeAI({
  messages,
  mode = "chat",
  language = "en",
}: {
  messages: AiMessage[];
  mode?: "chat" | "disease" | "recommendation" | "yield";
  language?: string;
}): Promise<string> {
  let result = "";
  let requestError: string | undefined;

  await streamChat({
    messages,
    mode,
    language,
    onDelta: (text) => {
      result += text;
    },
    onDone: () => {},
    onError: (error) => {
      requestError = error;
    },
  });

  if (requestError) {
    throw new Error(requestError);
  }

  return result;
}