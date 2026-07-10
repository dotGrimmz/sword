import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const HIGHLIGHT_FILTER_COLORS = [
  "blue",
  "yellow",
  "green",
  "pink",
  "purple",
] as const;

export type HighlightFilterColor = (typeof HIGHLIGHT_FILTER_COLORS)[number];
export type HighlightTab = "timeline" | "by-book";

type HighlightsPreferencesState = {
  searchQuery: string;
  selectedColor: "all" | HighlightFilterColor;
  tabValue: HighlightTab;
  setSearchQuery: (query: string) => void;
  setSelectedColor: (color: "all" | HighlightFilterColor) => void;
  setTabValue: (tab: HighlightTab) => void;
  resetFilters: () => void;
};

const defaultState = {
  searchQuery: "",
  selectedColor: "all" as const,
  tabValue: "timeline" as HighlightTab,
};

export const useHighlightsPreferencesStore = create<HighlightsPreferencesState>()(
  persist(
    (set) => ({
      ...defaultState,

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setSelectedColor: (selectedColor) => set({ selectedColor }),

      setTabValue: (tabValue) => set({ tabValue }),

      resetFilters: () => set(defaultState),
    }),
    {
      name: "sword-highlights-preferences",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
