type EventDetail = {
  source?: string;
};

export const NOTES_UPDATED_EVENT = "sword:notes/updated";
export const HIGHLIGHTS_UPDATED_EVENT = "sword:highlights/updated";
export const MEMORY_UPDATED_EVENT = "sword:memory/updated";
export const BOOKMARKS_UPDATED_EVENT = "sword:bookmarks/updated";

const dispatchCustomEvent = (name: string, detail?: EventDetail) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<EventDetail>(name, {
      detail,
    })
  );
};

export const dispatchNotesUpdated = (detail?: EventDetail) => {
  dispatchCustomEvent(NOTES_UPDATED_EVENT, detail);
};

export const dispatchHighlightsUpdated = (detail?: EventDetail) => {
  dispatchCustomEvent(HIGHLIGHTS_UPDATED_EVENT, detail);
};

export const dispatchMemoryUpdated = (detail?: EventDetail) => {
  dispatchCustomEvent(MEMORY_UPDATED_EVENT, detail);
};

export const dispatchBookmarksUpdated = (detail?: EventDetail) => {
  dispatchCustomEvent(BOOKMARKS_UPDATED_EVENT, detail);
};

export type SharedEventDetail = EventDetail;
