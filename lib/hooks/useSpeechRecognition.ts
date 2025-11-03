import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RecognitionStatus = "idle" | "recording" | "complete" | "error";

type RecognitionCallbacks = {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

type StartOptions = RecognitionCallbacks & {
  lang?: string;
  interimResults?: boolean;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((event: Event) => void) | null;
  onaudioend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const getRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const ctor =
    (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor })
      .SpeechRecognition || window.webkitSpeechRecognition;

  return ctor ?? null;
};

const extractTranscript = (event: SpeechRecognitionEvent) => {
  const { results } = event;
  const transcripts: string[] = [];

  for (let i = 0; i < results.length; i += 1) {
    const result = results.item(i);
    if (!result) continue;
    const alternative = result.item(0);
    if (!alternative) continue;
    transcripts.push(alternative.transcript);
  }

  return transcripts.join(" ").trim();
};

const formatError = (error: SpeechRecognitionErrorEvent | Event): string => {
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if ("error" in error && typeof error.error === "string") {
    switch (error.error) {
      case "not-allowed":
        return "Microphone permission was denied.";
      case "service-not-allowed":
        return "Microphone use is not allowed on this device.";
      case "no-speech":
        return "No speech was detected. Try again.";
      case "aborted":
        return "Recording was interrupted.";
      default:
        return `Speech recognition error: ${error.error}`;
    }
  }

  return "Speech recognition failed.";
};

export const useSpeechRecognition = () => {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbacksRef = useRef<RecognitionCallbacks>({});
  const statusRef = useRef<RecognitionStatus>("idle");

  const cleanupRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    setSupported(getRecognitionConstructor() !== null);
    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  const reset = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    }
    cleanupRecognition();
    setStatus("idle");
    statusRef.current = "idle";
    setTranscript("");
    setError(null);
  }, [cleanupRecognition]);

  const stopRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return false;
    }
    try {
      recognition.stop();
      return true;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to stop recording.");
      return false;
    }
  }, []);

  const startRecording = useCallback(
    (options?: StartOptions) => {
      const RecognitionCtor = getRecognitionConstructor();
      if (!RecognitionCtor) {
        setSupported(false);
        setStatus("error");
        statusRef.current = "error";
        setError("Voice note unavailable on this browser.");
        options?.onError?.("Voice note unavailable on this browser.");
        return false;
      }

      cleanupRecognition();
      const recognition = new RecognitionCtor();
      recognition.lang = options?.lang ?? "en-US";
      recognition.interimResults = options?.interimResults ?? true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      callbacksRef.current = {
        onResult: options?.onResult,
        onError: options?.onError,
        onEnd: options?.onEnd,
      };

      recognition.onresult = (event) => {
        const text = extractTranscript(event);
        setTranscript(text);
        callbacksRef.current.onResult?.(
          text,
          event.results.item(event.results.length - 1)?.isFinal ?? false
        );
      };

      recognition.onerror = (event) => {
        const message = formatError(event);
        setStatus("error");
        statusRef.current = "error";
        setError(message);
        callbacksRef.current.onError?.(message);
      };

      recognition.onend = () => {
        if (statusRef.current === "recording") {
          const nextStatus =
            transcript.trim().length > 0 ? "complete" : "idle";
          setStatus(nextStatus);
          statusRef.current = nextStatus;
        }
        callbacksRef.current.onEnd?.();
      };

      try {
        setTranscript("");
        setError(null);
        setStatus("recording");
        statusRef.current = "recording";
        recognition.start();
        recognitionRef.current = recognition;
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to start speech recognition.";
        setStatus("error");
        statusRef.current = "error";
        setError(message);
        callbacksRef.current.onError?.(message);
        return false;
      }
    },
    [cleanupRecognition, transcript]
  );

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const state = useMemo(
    () => ({
      supported,
      status,
      transcript,
      error,
      startRecording,
      stopRecording,
      reset,
    }),
    [supported, status, transcript, error, startRecording, stopRecording, reset]
  );

  return state;
};
