import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const loadStageCopy = async () => {
  const mod = await loadTsModule("components/notes/audioNoteStages.ts");
  return mod.AUDIO_NOTE_STAGE_COPY;
};

describe("AUDIO_NOTE_STAGE_COPY", () => {
  it("provides entries for each stage", async () => {
    const AUDIO_NOTE_STAGE_COPY = await loadStageCopy();
    const stages = Object.keys(AUDIO_NOTE_STAGE_COPY);
    assert.deepEqual(stages.sort(), [
      "confirming-note",
      "confirming-reference",
      "idle",
      "recording-note",
      "recording-reference",
    ]);
  });

  it("includes descriptive copy for the confirming-note stage", async () => {
    const AUDIO_NOTE_STAGE_COPY = await loadStageCopy();
    const copy = AUDIO_NOTE_STAGE_COPY["confirming-note"];

    assert.ok(copy);
    assert.equal(copy.breadcrumb, "Step 2 • Confirm note");
    assert.equal(copy.title, "Review note");
    assert.equal(copy.subtitle, "Edit your note before saving.");
  });
});
