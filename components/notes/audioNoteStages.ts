export type AudioNoteStage =
  | "idle"
  | "recording-reference"
  | "confirming-reference"
  | "recording-note"
  | "confirming-note";

export type AudioNoteStageCopy = {
  breadcrumb: string;
  title: string;
  subtitle: string;
};

export const AUDIO_NOTE_STAGE_COPY: Record<AudioNoteStage, AudioNoteStageCopy> =
  {
    idle: {
      breadcrumb: "Step 1 • Prepare",
      title: "Capture a new voice note",
      subtitle: "Record the passage first, then share your reflection.",
    },
    "recording-reference": {
      breadcrumb: "Step 1 • Recording reference",
      title: "Listening for reference",
      subtitle: "Speak the book, chapter, and verse.",
    },
    "confirming-reference": {
      breadcrumb: "Step 1 • Confirm reference",
      title: "Confirm reference",
      subtitle: "Adjust the reference details if needed.",
    },
    "recording-note": {
      breadcrumb: "Step 2 • Recording note",
      title: "Listening for note",
      subtitle: "Share your reflection in your own words.",
    },
    "confirming-note": {
      breadcrumb: "Step 2 • Confirm note",
      title: "Review note",
      subtitle: "Edit your note before saving.",
    },
  };
