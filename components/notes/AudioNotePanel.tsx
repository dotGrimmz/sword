"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { toast } from "sonner";
import { Mic, RotateCcw, Square, Loader2 } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { parseReferenceFromText } from "@/lib/bible/parseReferenceFromText";
import type { BibleBookSummary } from "@/types/bible";
import {
  AUDIO_NOTE_STAGE_COPY,
  type AudioNoteStage,
} from "./audioNoteStages";

import styles from "./AudioNotePanel.module.css";

type SubmitPayload = {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  body: string;
};

export type AudioNotePayload = SubmitPayload;

interface AudioNotePanelProps {
  isOpen: boolean;
  books: BibleBookSummary[];
  onClose: () => void;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
}

const normaliseBookKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const TRANSITION_DELAY_MS = 450;

const clearTimeoutRef = (
  ref: MutableRefObject<ReturnType<typeof setTimeout> | null>
) => {
  if (ref.current !== null) {
    globalThis.clearTimeout(ref.current);
    ref.current = null;
  }
};

export function AudioNotePanel({
  isOpen,
  books,
  onClose,
  onSubmit,
}: AudioNotePanelProps) {
  const [stage, setStage] = useState<AudioNoteStage>("idle");
  const [referenceTranscript, setReferenceTranscript] = useState("");
  const [noteTranscript, setNoteTranscript] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [chapterValue, setChapterValue] = useState("1");
  const [verseStartValue, setVerseStartValue] = useState("1");
  const [verseEndValue, setVerseEndValue] = useState("1");
  const [noteBody, setNoteBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const referenceTranscriptRef = useRef("");
  const noteTranscriptRef = useRef("");
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const { supported, status, error, startRecording, stopRecording, reset } =
    useSpeechRecognition();

  const bookOptions = useMemo(() => {
    return books.map((book) => ({
      id: book.id,
      name: book.name,
      key: normaliseBookKey(book.name),
      abbreviation: book.abbreviation
        ? normaliseBookKey(book.abbreviation)
        : null,
      chapters: book.chapters,
    }));
  }, [books]);

  const resetState = useCallback(() => {
    clearTimeoutRef(transitionTimeoutRef);
    setStage("idle");
    setReferenceTranscript("");
    setNoteTranscript("");
    referenceTranscriptRef.current = "";
    noteTranscriptRef.current = "";
    setSelectedBookId(null);
    setChapterValue("1");
    setVerseStartValue("1");
    setVerseEndValue("1");
    setNoteBody("");
    setIsSaving(false);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen || status !== "error" || !error) return;
    toast.error(error);
  }, [error, isOpen, status]);

  useEffect(
    () => () => {
      clearTimeoutRef(transitionTimeoutRef);
    },
    []
  );

  const assignBookFromParsed = useCallback(
    (bookName: string | null) => {
      if (!bookName) {
        setSelectedBookId(bookOptions[0]?.id ?? null);
        return;
      }

      const key = normaliseBookKey(bookName);
      const match = bookOptions.find((option) => {
        if (option.key === key) return true;
        if (option.abbreviation && option.abbreviation === key) return true;
        return false;
      });

      setSelectedBookId(match?.id ?? bookOptions[0]?.id ?? null);
    },
    [bookOptions]
  );

  const handleReferenceComplete = useCallback(() => {
    const finalTranscript = referenceTranscriptRef.current.trim();

    if (finalTranscript.length === 0) {
      toast.error("No speech detected. Try again.");
      setStage("idle");
      setReferenceTranscript("");
      reset();
      return;
    }

    setReferenceTranscript(finalTranscript);
    referenceTranscriptRef.current = finalTranscript;
    const parsed = parseReferenceFromText(finalTranscript);
    assignBookFromParsed(parsed.book);

    if (parsed.chapter) {
      setChapterValue(String(parsed.chapter));
    } else {
      setChapterValue("1");
    }

    if (parsed.verseStart) {
      setVerseStartValue(String(parsed.verseStart));
      setVerseEndValue(String(parsed.verseEnd ?? parsed.verseStart));
    } else {
      setVerseStartValue("1");
      setVerseEndValue("1");
    }

    const referenceLabelParts: string[] = [];
    if (parsed.book) {
      referenceLabelParts.push(parsed.book);
    }
    if (parsed.chapter) {
      let chapterLabel = String(parsed.chapter);
      if (parsed.verseStart) {
        const verseSegment =
          parsed.verseEnd && parsed.verseEnd !== parsed.verseStart
            ? `${parsed.verseStart}-${parsed.verseEnd}`
            : String(parsed.verseStart);
        chapterLabel = `${chapterLabel}:${verseSegment}`;
      }
      referenceLabelParts.push(chapterLabel);
    }

    const referenceLabel = referenceLabelParts.join(" ");

    toast.success(
      referenceLabel.length > 0
        ? `✅ Captured ${referenceLabel}`
        : "Reference captured"
    );
    reset();
    clearTimeoutRef(transitionTimeoutRef);
    transitionTimeoutRef.current = globalThis.setTimeout(() => {
      setStage("confirming-reference");
      transitionTimeoutRef.current = null;
    }, TRANSITION_DELAY_MS);
  }, [assignBookFromParsed, reset]);

  const handleNoteComplete = useCallback(() => {
    const finalTranscript = noteTranscriptRef.current.trim();

    if (finalTranscript.length === 0) {
      toast.error("No speech detected. Try again.");
      setNoteTranscript("");
      setNoteBody("");
      setStage("recording-note");
      return;
    }

    setNoteTranscript(finalTranscript);
    noteTranscriptRef.current = finalTranscript;
    setNoteBody(finalTranscript);
    toast.success("Transcription captured.");
    reset();
    clearTimeoutRef(transitionTimeoutRef);
    transitionTimeoutRef.current = globalThis.setTimeout(() => {
      setStage("confirming-note");
      transitionTimeoutRef.current = null;
    }, TRANSITION_DELAY_MS);
  }, [reset]);

  const beginReferenceRecording = useCallback(() => {
    if (!supported) {
      toast.error("Voice note unavailable on this browser.");
      return;
    }

    clearTimeoutRef(transitionTimeoutRef);
    setReferenceTranscript("");
    referenceTranscriptRef.current = "";
    setStage("recording-reference");
    toast("🎧 Listening for reference…");
    const started = startRecording({
      onResult: (text) => {
        setReferenceTranscript(text);
        referenceTranscriptRef.current = text;
      },
      onEnd: handleReferenceComplete,
      onError: (message) => {
        toast.error(message);
        setStage("idle");
      },
      interimResults: true,
    });

    if (!started) {
      setStage("idle");
    }
  }, [handleReferenceComplete, startRecording, supported]);

  const beginNoteRecording = useCallback(() => {
    if (!supported) {
      toast.error("Voice note unavailable on this browser.");
      return;
    }

    clearTimeoutRef(transitionTimeoutRef);
    setNoteTranscript("");
    noteTranscriptRef.current = "";
    setNoteBody("");
    setStage("recording-note");
    toast("🎙 Recording note…");
    const started = startRecording({
      onResult: (text) => {
        setNoteTranscript(text);
        noteTranscriptRef.current = text;
      },
      onEnd: handleNoteComplete,
      onError: (message) => {
        toast.error(message);
        setStage("confirming-reference");
      },
      interimResults: true,
    });

    if (!started) {
      setStage("confirming-reference");
    }
  }, [handleNoteComplete, startRecording, supported]);

  const handleStop = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleReferenceConfirm = useCallback(() => {
    if (!selectedBookId) {
      toast.error("Select a book before continuing.");
      return;
    }

    const chapter = Number(chapterValue);
    const verseStart = Number(verseStartValue);
    const verseEnd = Number(verseEndValue);

    if (!Number.isFinite(chapter) || chapter < 1) {
      toast.error("Chapter must be a positive number.");
      return;
    }

    if (!Number.isFinite(verseStart) || verseStart < 1) {
      toast.error("Verse must be a positive number.");
      return;
    }

    if (!Number.isFinite(verseEnd) || verseEnd < verseStart) {
      toast.error("Verse range is invalid.");
      return;
    }

    beginNoteRecording();
  }, [beginNoteRecording, chapterValue, selectedBookId, verseEndValue, verseStartValue]);

  const handleRestart = useCallback(() => {
    toast("Starting over.");
    resetState();
  }, [resetState]);

  const handleSave = useCallback(async () => {
    if (!selectedBookId) {
      toast.error("Select a book before saving.");
      return;
    }

    const chapter = Number(chapterValue);
    const verseStart = Number(verseStartValue);
    const verseEnd = Number(verseEndValue);
    const body = noteBody.trim();

    if (!Number.isFinite(chapter) || chapter < 1) {
      toast.error("Chapter must be a positive number.");
      return;
    }

    if (!Number.isFinite(verseStart) || verseStart < 1) {
      toast.error("Verse must be a positive number.");
      return;
    }

    if (!Number.isFinite(verseEnd) || verseEnd < verseStart) {
      toast.error("Verse range is invalid.");
      return;
    }

    if (body.length === 0) {
      toast.error("Add a reflection before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        bookId: selectedBookId,
        chapter,
        verseStart,
        verseEnd,
        body,
      });
      toast.success("💾 Note saved.");
      onClose();
      resetState();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save note.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [chapterValue, noteBody, onClose, onSubmit, resetState, selectedBookId, verseEndValue, verseStartValue]);

  if (!supported) {
    return (
      <div className={styles.unsupported}>
        <h3 className={styles.stageTitle}>Voice note unavailable</h3>
        <p className={styles.stageSubtitle}>
          This browser does not support the Web Speech API. Try using Chrome, Edge,
          or another browser with speech recognition support.
        </p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.stageHeader}>
        <span className={styles.stageBreadcrumb}>
          {AUDIO_NOTE_STAGE_COPY[stage].breadcrumb}
        </span>
        <h2 className={styles.stageTitle}>
          {AUDIO_NOTE_STAGE_COPY[stage].title}
        </h2>
        <p className={styles.stageSubtitle}>
          {AUDIO_NOTE_STAGE_COPY[stage].subtitle}
        </p>
      </div>

      {stage === "idle" ? (
        <div className={styles.controlRow}>
          <Button onClick={beginReferenceRecording}>
            <Mic size={16} /> Start recording reference
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      ) : null}

      {stage === "recording-reference" ? (
        <div className={styles.controlRow}>
          <Button variant="destructive" onClick={handleStop}>
            <Square size={16} /> Stop
          </Button>
          <div className={styles.infoBanner}>🎧 Listening for reference…</div>
          {referenceTranscript ? (
            <div className={styles.transcriptBox}>{referenceTranscript}</div>
          ) : null}
        </div>
      ) : null}

      {stage === "confirming-reference" ? (
        <>
          <div className={styles.transcriptBox}>{referenceTranscript}</div>
          <div className={styles.fieldset}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="audio-note-book">
                Book
              </label>
              <Select
                value={selectedBookId ?? undefined}
                onValueChange={(value) => setSelectedBookId(value)}
              >
                <SelectTrigger id="audio-note-book">
                  <SelectValue placeholder="Select book" />
                </SelectTrigger>
                <SelectContent>
                  {bookOptions.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="audio-note-chapter">
                Chapter
              </label>
              <Input
                id="audio-note-chapter"
                value={chapterValue}
                onChange={(event) => setChapterValue(event.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="audio-note-verse-start">
                Verse start
              </label>
              <Input
                id="audio-note-verse-start"
                value={verseStartValue}
                onChange={(event) => setVerseStartValue(event.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="audio-note-verse-end">
                Verse end
              </label>
              <Input
                id="audio-note-verse-end"
                value={verseEndValue}
                onChange={(event) => setVerseEndValue(event.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={handleRestart}>
              <RotateCcw size={16} /> Restart
            </Button>
            <Button onClick={handleReferenceConfirm}>Next: record note</Button>
          </div>
        </>
      ) : null}

      {stage === "recording-note" ? (
        <div className={styles.controlRow}>
          <Button variant="destructive" onClick={handleStop}>
            <Square size={16} /> Stop
          </Button>
          <div className={styles.infoBanner}>🎙 Recording note…</div>
          {noteTranscript ? (
            <div className={styles.transcriptBox}>{noteTranscript}</div>
          ) : null}
        </div>
      ) : null}

      {stage === "confirming-note" ? (
        <>
          <Textarea
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            className={styles.noteTextarea}
            placeholder="Edit your note before saving..."
          />
          <div className={styles.actions}>
            <Button variant="ghost" onClick={handleRestart}>
              <RotateCcw size={16} /> Restart
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save note
            </Button>
          </div>
        </>
      ) : null}

      {stage === "idle" ? (
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}
