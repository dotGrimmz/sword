"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "stopped" | "error";

const formatError = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone access was denied.";
    }

    if (error.name === "NotFoundError") {
      return "No microphone was found.";
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Recording failed due to an unknown error.";
};

export const useAudioRecorder = () => {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupStream = () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
    mediaStreamRef.current = null;
  };

  const resetRecorder = useCallback(() => {
    setStatus("idle");
    setError(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setDuration(0);
    chunksRef.current = [];
    clearTimer();
    cleanupStream();
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined") {
      setError("Recording is not supported in this environment.");
      setStatus("error");
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported on this device.");
      setStatus("error");
      return false;
    }

    if (status === "recording") {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setError(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearTimer();
        cleanupStream();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(URL.createObjectURL(blob));
        setStatus("stopped");
      };

      recorder.onerror = (event) => {
        clearTimer();
        cleanupStream();
        setStatus("error");
        setError(formatError(event.error));
      };

      recorder.start();
      setStatus("recording");
      startTimestampRef.current = Date.now();
      setDuration(0);
      clearTimer();
      timerRef.current = window.setInterval(() => {
        if (startTimestampRef.current) {
          setDuration(Date.now() - startTimestampRef.current);
        }
      }, 200);

      return true;
    } catch (err) {
      cleanupStream();
      setStatus("error");
      setError(formatError(err));
      return false;
    }
  }, [audioUrl, status]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      return false;
    }
    try {
      recorder.stop();
      return true;
    } catch (err) {
      setStatus("error");
      setError(formatError(err));
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      resetRecorder();
    };
  }, [resetRecorder]);

  const durationLabel = useMemo(() => {
    const totalSeconds = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [duration]);

  return {
    status,
    error,
    audioBlob,
    audioUrl,
    duration,
    durationLabel,
    startRecording,
    stopRecording,
    resetRecorder,
  };
};
