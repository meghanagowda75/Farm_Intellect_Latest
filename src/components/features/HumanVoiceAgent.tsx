import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  VolumeX,
  Trash2,
} from "lucide-react";
import { AI_CONFIG } from "@/config/aiConfig";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = {
  error: string;
};

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => RecognitionInstance;

const LANGUAGES = [
  { code: "en-IN", name: "English" },
  { code: "hi-IN", name: "हिंदी" },
  { code: "kn-IN", name: "ಕನ್ನಡ" },
  { code: "te-IN", name: "తెలుగు" },
  { code: "ta-IN", name: "தமிழ்" },
  { code: "bn-IN", name: "বাংলা" },
  { code: "mr-IN", name: "मराठी" },
  { code: "gu-IN", name: "ગુજરાતી" },
  { code: "ml-IN", name: "മലയാളം" },
  { code: "pa-IN", name: "ਪੰਜਾਬੀ" },
  { code: "or-IN", name: "ଓଡ଼ିଆ" },
  { code: "as-IN", name: "অসমীয়া" },
  { code: "ur-IN", name: "اردو" },
];

const getSpeechRecognition = (): RecognitionConstructor | undefined => {
  const browserWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };

  return (
    browserWindow.SpeechRecognition ||
    browserWindow.webkitSpeechRecognition
  );
};

export const HumanVoiceAgent = () => {
  const { language } = useLanguage();

  const [selectedLang, setSelectedLang] = useState(() => {
    const existing = LANGUAGES.find(
      (item) =>
        item.code === language ||
        item.code.startsWith(`${language || "en"}-`)
    );

    return existing?.code || "en-IN";
  });

  const [status, setStatus] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");

  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [error, setError] = useState("");

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const historyRef = useRef<Message[]>([]);
  const statusRef = useRef(status);

  statusRef.current = status;
  historyRef.current = history;

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (mountedRef.current) {
      setStatus("idle");
    }
  }, []);

  const askGemini = useCallback(async (question: string) => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setStatus("idle");
      return;
    }

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setError("");
    setStatus("thinking");
    setInterimTranscript("");

    try {
      const messages = [
        {
          role: "system",
          content:
            "You are Farm Intellect, a helpful agricultural AI assistant. " +
            "Give practical, accurate farming advice. " +
            "Answer in the language used by the farmer whenever possible. " +
            "For agriculture questions, consider crop type, soil, season, " +
            "water availability, pests, diseases, and local conditions. " +
            "Do not invent live weather, market prices, or guaranteed yields. " +
            "Explain when advice depends on local conditions.",
        },
        ...historyRef.current.slice(-4),
        {
          role: "user",
          content: trimmedQuestion,
        },
      ];

      const response = await fetch(
        `${AI_CONFIG.API_BASE_URL}/api/chat/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            languageCode: selectedLang,
            mode: "chat",
          }),
          signal: controller.signal,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `AI request failed with status ${response.status}.`
        );
      }

      const answer =
        typeof data.content === "string" ? data.content.trim() : "";

      if (!answer) {
        throw new Error("The AI returned an empty response. Try again.");
      }

      if (!mountedRef.current) return;

      setReply(answer);

      const updatedHistory: Message[] = [
        ...historyRef.current,
        { role: "user", content: trimmedQuestion },
        { role: "assistant", content: answer },
      ].slice(-20);

      historyRef.current = updatedHistory;
      setHistory(updatedHistory);

      if (!("speechSynthesis" in window)) {
        setStatus("idle");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = selectedLang;
      utterance.rate = 0.95;

      const availableVoices = window.speechSynthesis.getVoices();

      const matchingVoice = availableVoices.find(
        (voice) =>
          voice.lang.toLowerCase() === selectedLang.toLowerCase()
      );

      const matchingLanguageVoice = availableVoices.find(
        (voice) =>
          voice.lang
            .toLowerCase()
            .startsWith(selectedLang.split("-")[0].toLowerCase())
      );

      const chosenVoice = matchingVoice || matchingLanguageVoice;

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onstart = () => {
        if (mountedRef.current) setStatus("speaking");
      };

      utterance.onend = () => {
        if (mountedRef.current) setStatus("idle");
      };

      utterance.onerror = (event) => {
        if (!mountedRef.current) return;

        setStatus("idle");

        if (event.error !== "canceled" && event.error !== "interrupted") {
          setError(
            "The answer is available as text, but speech playback failed."
          );
        }
      };

      window.speechSynthesis.cancel();
      setStatus("speaking");
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;

      if (!mountedRef.current) return;

      const message =
        err instanceof Error ? err.message : "Unable to get an AI response.";

      setError(message);
      setStatus("idle");
      toast.error(message);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }
    }
  }, [selectedLang]);

  const startListening = useCallback(() => {
    setError("");
    setTranscript("");
    setInterimTranscript("");
    setReply("");

    if (statusRef.current === "speaking") {
      window.speechSynthesis?.cancel();
    }

    const Recognition = getSpeechRecognition();

    if (!Recognition) {
      const message =
        "Speech recognition is not supported in this browser. Please use Google Chrome.";

      setError(message);
      toast.error(message);
      return;
    }

    try {
      recognitionRef.current?.abort();

      const recognition = new Recognition();

      recognition.lang = selectedLang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (mountedRef.current) {
          setStatus("listening");
        }
      };

      recognition.onresult = (event) => {
        let finalText = "";
        let temporaryText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || "";

          if (result.isFinal) {
            finalText += `${text} `;
          } else {
            temporaryText += `${text} `;
          }
        }

        if (finalText.trim()) {
          setTranscript((previous) =>
            `${previous} ${finalText}`.trim()
          );
        }

        setInterimTranscript(temporaryText.trim());
      };

      recognition.onerror = (event) => {
        if (!mountedRef.current) return;

        if (
          event.error === "aborted" ||
          event.error === "no-speech"
        ) {
          setStatus("idle");

          if (event.error === "no-speech") {
            setError("No speech detected. Please try speaking again.");
          }

          return;
        }

        const messages: Record<string, string> = {
          "not-allowed":
            "Microphone permission was denied. Allow microphone access in Chrome.",
          "service-not-allowed":
            "The browser speech recognition service is unavailable.",
          "audio-capture":
            "No microphone was detected. Check your microphone connection.",
          network:
            "Speech recognition network error. Check your internet connection.",
        };

        const message =
          messages[event.error] ||
          `Speech recognition failed: ${event.error}`;

        setError(message);
        setStatus("idle");
        toast.error(message);
      };

      recognition.onend = () => {
        recognitionRef.current = null;

        if (!mountedRef.current) return;

        setStatus((current) =>
          current === "listening" ? "idle" : current
        );

        const finalQuestion = transcriptRef.current.trim();

        if (finalQuestion) {
          void askGemini(finalQuestion);
        }
      };

      transcriptRef.current = "";
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      recognitionRef.current = null;
      setStatus("idle");

      const message =
        err instanceof Error
          ? err.message
          : "Could not start speech recognition.";

      setError(message);
      toast.error(message);
    }
  }, [askGemini, selectedLang]);

  const transcriptRef = useRef("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.stop();
    }
  }, []);

  const clearConversation = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;

    requestRef.current?.abort();
    requestRef.current = null;

    window.speechSynthesis?.cancel();

    historyRef.current = [];
    setHistory([]);
    setTranscript("");
    setInterimTranscript("");
    setReply("");
    setError("");
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      recognitionRef.current?.abort();
      requestRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleMic = () => {
    if (status === "listening") {
      stopListening();
    } else if (status === "speaking") {
      stopSpeech();
    } else if (status === "thinking") {
      requestRef.current?.abort();
      setStatus("idle");
    } else {
      startListening();
    }
  };

  const statusLabel = {
    idle: "Ready to talk",
    listening: "Listening…",
    thinking: "Thinking…",
    speaking: "Speaking…",
  }[status];

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Multi-Language Voice Assistant
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask farming questions using your voice.
            </p>
          </div>

          <Badge
            variant={
              status === "listening"
                ? "destructive"
                : status === "speaking"
                  ? "default"
                  : "secondary"
            }
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Select your language
          </label>

          <Select
            value={selectedLang}
            onValueChange={setSelectedLang}
            disabled={status !== "idle"}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a language" />
            </SelectTrigger>

            <SelectContent>
              {LANGUAGES.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/20 p-6">
          <Button
            type="button"
            onClick={handleMic}
            disabled={false}
            className="h-20 w-20 rounded-full shadow-lg"
            variant={status === "listening" ? "destructive" : "default"}
            aria-label={
              status === "listening"
                ? "Stop recording"
                : status === "speaking"
                  ? "Stop speaking"
                  : "Start voice assistant"
            }
          >
            {status === "thinking" ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : status === "listening" ? (
              <Square className="h-8 w-8" />
            ) : status === "speaking" ? (
              <VolumeX className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {status === "listening"
              ? "Speak now, then stop the microphone."
              : status === "thinking"
                ? "Generating your farming answer…"
                : status === "speaking"
                  ? "Tap to stop the voice."
                  : "Tap the microphone and ask a question."}
          </p>
        </div>

        {(transcript || interimTranscript) && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your question
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {transcript}{" "}
              <span className="text-muted-foreground">
                {interimTranscript}
              </span>
            </p>
          </div>
        )}

        {reply && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Farm Intellect AI
            </p>
            <p className="whitespace-pre-wrap text-sm leading-6">
              {reply}
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                if (!("speechSynthesis" in window)) {
                  setError("Speech playback is not supported.");
                  return;
                }

                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(reply);
                utterance.lang = selectedLang;
                utterance.rate = 0.95;

                const voices = window.speechSynthesis.getVoices();

                utterance.voice =
                  voices.find(
                    (item) =>
                      item.lang.toLowerCase() ===
                      selectedLang.toLowerCase()
                  ) ||
                  voices.find((item) =>
                    item.lang
                      .toLowerCase()
                      .startsWith(selectedLang.split("-")[0].toLowerCase())
                  ) ||
                  null;

                utterance.onend = () => setStatus("idle");
                utterance.onerror = () => setStatus("idle");

                setStatus("speaking");
                window.speechSynthesis.speak(utterance);
              }}
            >
              <Volume2 className="mr-2 h-4 w-4" />
              Read answer aloud
            </Button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {history.length > 0 && (
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Conversation history ({history.length / 2} turns)
            </summary>

            <div className="mt-3 space-y-3">
              {history.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className="rounded-md bg-muted/40 p-3"
                >
                  <p className="mb-1 text-xs font-semibold">
                    {message.role === "user" ? "You" : "Farm Intellect AI"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={clearConversation}
          disabled={status === "idle" && history.length === 0 && !error}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear conversation
        </Button>
      </CardContent>
    </Card>
  );
};

export default HumanVoiceAgent;