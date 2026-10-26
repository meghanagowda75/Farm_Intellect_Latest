
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Status = "idle" | "listening" | "thinking" | "speaking";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

interface Options {
  language?: string;
  voice?: string;
  region?: string;
  onError?: (msg: string) => void;
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type TranscriptionResponse = {
  transcript?: string;
};

type ChatResponse = {
  content?: string;
};

function encodeWav(chunks: Float32Array[], sourceRate: number): Blob {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);

  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const targetRate = 16000;
  const ratio = sourceRate / targetRate;
  const outputLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sample = merged[Math.floor(i * ratio)] || 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    samples[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (position: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(position + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);

  return new Blob([buffer], { type: "audio/wav" });
}

export function useHumanVoiceAgent(opts: Options = {}) {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [history, setHistory] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const spokeRef = useRef(false);
  const silenceRef = useRef(0);
  const lastTimeRef = useRef(0);
  const finishingRef = useRef(false);
  const mountedRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const historyRef = useRef<Msg[]>([]);
  const optsRef = useRef(opts);

  optsRef.current = opts;

  const reportError = useCallback((message: string) => {
    if (!mountedRef.current) return;

    setError(message);
    setStatus("idle");
    optsRef.current.onError?.(message);
  }, []);

  const cleanupCapture = useCallback(() => {
    if (nodeRef.current) {
      nodeRef.current.onaudioprocess = null;
      nodeRef.current.disconnect();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
    }

    nodeRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setStatus((current) => (current === "speaking" ? "idle" : current));
  }, []);

  const chatAndSpeak = useCallback(
    async (userText: string) => {
      const controller = new AbortController();
      requestRef.current?.abort();
      requestRef.current = controller;

      try {
        setStatus("thinking");

        const messages: ChatMessage[] = [
          {
            role: "system",
            content:
              "You are a helpful agricultural and farming assistant. " +
              "Answer clearly and practically. Use the user's language when possible.",
          },
          ...historyRef.current.slice(-8),
          { role: "user", content: userText },
        ];

        const data = await apiFetch<ChatResponse>("/api/chat/complete", {
          method: "POST",
          body: JSON.stringify({
            messages,
            languageCode: optsRef.current.language || "en",
          }),
          signal: controller.signal,
        });

        const answer = data.content?.trim();

        if (!answer) {
          throw new Error("The chat service returned an empty response.");
        }

        if (!mountedRef.current) return;

        setReply(answer);

        const updatedHistory: Msg[] = [
          ...historyRef.current,
          { role: "user", content: userText },
          { role: "assistant", content: answer },
        ].slice(-20);

        historyRef.current = updatedHistory;
        setHistory(updatedHistory);

        if (!("speechSynthesis" in window)) {
          setStatus("idle");
          return;
        }

        const utterance = new SpeechSynthesisUtterance(answer);
        const language = optsRef.current.language || "en-IN";

        utterance.lang = language === "en" ? "en-IN" : language;

        const preferredVoice = optsRef.current.voice;

        if (preferredVoice) {
          const voice = window.speechSynthesis
            .getVoices()
            .find((item) => item.name === preferredVoice);

          if (voice) utterance.voice = voice;
        }

        utterance.onstart = () => {
          if (mountedRef.current) setStatus("speaking");
        };

        utterance.onend = () => {
          if (mountedRef.current) setStatus("idle");
        };

        utterance.onerror = () => {
          if (mountedRef.current) setStatus("idle");
        };

        window.speechSynthesis.cancel();
        setStatus("speaking");
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        reportError(
          err instanceof Error ? err.message : "Chat request failed."
        );
      } finally {
        if (requestRef.current === controller) {
          requestRef.current = null;
        }
      }
    },
    [reportError]
  );

  const finishRecording = useCallback(async () => {
    if (finishingRef.current) return;

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    finishingRef.current = true;

    const chunks = chunksRef.current;
    const sampleRate = ctx.sampleRate;
    const hasSpeech = spokeRef.current;

    cleanupCapture();
    chunksRef.current = [];

    try {
      if (!hasSpeech || chunks.length === 0) {
        setStatus("idle");
        return;
      }

      const audioBlob = encodeWav(chunks, sampleRate);

      if (audioBlob.size < 2048) {
        setStatus("idle");
        return;
      }

      setStatus("thinking");

      const form = new FormData();
      form.append("audio", audioBlob, "recording.wav");
      form.append("languageCode", optsRef.current.language || "en-IN");

      const controller = new AbortController();
      requestRef.current?.abort();
      requestRef.current = controller;

      const data = await apiFetch<TranscriptionResponse>(
        "/api/chat/voice/transcribe",
        {
          method: "POST",
          body: form,
          signal: controller.signal,
        }
      );

      const recognizedText = data.transcript?.trim();

      if (!recognizedText) {
        throw new Error(
          "No speech was detected. Please try speaking again."
        );
      }

      if (!mountedRef.current) return;

      setTranscript(recognizedText);
      await chatAndSpeak(recognizedText);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        reportError(
          err instanceof Error ? err.message : "Audio transcription failed."
        );
      }
    } finally {
      finishingRef.current = false;
    }
  }, [chatAndSpeak, cleanupCapture, reportError]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setReply("");
    finishingRef.current = false;

    requestRef.current?.abort();
    requestRef.current = null;
    window.speechSynthesis?.cancel();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone recording is unavailable. Use localhost or HTTPS."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);

      nodeRef.current = node;
      chunksRef.current = [];
      spokeRef.current = false;
      silenceRef.current = 0;
      lastTimeRef.current = performance.now();

      node.onaudioprocess = (event) => {
        if (finishingRef.current) return;

        const input = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));

        let sum = 0;
        for (let i = 0; i < input.length; i++) {
          sum += input[i] * input[i];
        }

        const rms = Math.sqrt(sum / input.length);
        const now = performance.now();
        const elapsed = now - lastTimeRef.current;
        lastTimeRef.current = now;

        if (rms > 0.02) {
          spokeRef.current = true;
          silenceRef.current = 0;
        } else if (spokeRef.current) {
          silenceRef.current += elapsed;

          if (silenceRef.current >= 1200) {
            void finishRecording();
          }
        }
      };

      source.connect(node);
      node.connect(ctx.destination);
      setStatus("listening");
    } catch (err) {
      cleanupCapture();

      reportError(
        err instanceof Error ? err.message : "Could not access the microphone."
      );
    }
  }, [cleanupCapture, finishRecording, reportError]);

  const stopListening = useCallback(() => {
    void finishRecording();
  }, [finishRecording]);

  const stopAll = useCallback(() => {
    finishingRef.current = false;
    cleanupCapture();

    requestRef.current?.abort();
    requestRef.current = null;

    window.speechSynthesis?.cancel();
    setStatus("idle");
  }, [cleanupCapture]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      finishingRef.current = false;
      cleanupCapture();
      requestRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, [cleanupCapture]);

  return {
    status,
    transcript,
    reply,
    history,
    error,
    startListening,
    stopListening,
    stopSpeaking,
    stopAll,
    isListening: status === "listening",
    isSpeaking: status === "speaking",
    isThinking: status === "thinking",
  };
}
