"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
} from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Calendar, Filter, Search, Share, Trash2 } from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { AppHeaderToolbar } from "./AppHeaderToolbar";
import { Button } from "./ui/button";
import controls from "@/components/realign/controls.module.css";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LoadingScreen } from "@/components/LoadingScreen";
import { buildReferenceLabel } from "@/lib/api/bible";
import type { BibleBookSummary } from "@/types/bible";
import type { UserHighlight } from "@/types/user";
import { HIGHLIGHTS_UPDATED_EVENT } from "@/lib/events";
import styles from "./HighlightsScreen.module.css";
import {
  useDeleteHighlightMutation,
  useHighlightsQuery,
  useRecolorHighlightMutation,
} from "@/lib/query/highlights";
import { usePassageTextsMap } from "@/lib/query/passages";
import { useHighlightsPreferencesStore, type HighlightTab } from "@/lib/stores/highlights-preferences-store";

interface HighlightsScreenProps {
  onNavigate?: (screen: string) => void;
}

type HighlightViewModel = {
  raw: UserHighlight;
  verseText: string;
  referenceLabel: string | null;
  bookName: string;
  color: string;
  dateLabel: string | null;
};

const availableFilterColors = ["blue", "yellow", "green", "pink", "purple"] as const;
type FilterColor = (typeof availableFilterColors)[number];

const cardAccentClasses: Record<FilterColor, string> = {
  blue: styles.highlightCardBlue,
  yellow: styles.highlightCardYellow,
  green: styles.highlightCardGreen,
  pink: styles.highlightCardPink,
  purple: styles.highlightCardPurple,
};

const colorToneClasses: Record<FilterColor, string> = {
  blue: styles.colorToneBlue,
  yellow: styles.colorToneYellow,
  green: styles.colorToneGreen,
  pink: styles.colorTonePink,
  purple: styles.colorTonePurple,
};

const resolveAccentClass = (color: string) =>
  cardAccentClasses[color as FilterColor] ?? styles.highlightCardFallback;

const divider = "-".repeat(64);

const formatDate = (iso: string | null) => {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const pad = (value: string | null | undefined) => (value ? value.trim() : "");

const formatHighlightsPlaintext = (
  items: HighlightViewModel[],
  translationCode: string | null | undefined,
) => {
  const now = new Date();
  const header = [
    "Favorites",
    now.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    translationCode ? `Translation: ${translationCode}` : undefined,
  ]
    .filter(Boolean)
    .join(" • ");

  const sections = items.map((item) => {
    const lines: string[] = [];
    lines.push(`${item.referenceLabel ?? "Unknown reference"}`);

    const metaBits = [
      item.bookName,
      item.color ? `Color: ${item.color}` : null,
      item.dateLabel ? `Updated: ${item.dateLabel}` : null,
    ].filter(Boolean);

    if (metaBits.length > 0) {
      lines.push(metaBits.join(" • "));
    }

    const verseText = pad(item.verseText) || "(Text unavailable)";
    lines.push(verseText);

    return lines.join("\n");
  });

  return [header, divider, sections.join(`\n\n${divider}\n\n`)].filter(Boolean).join("\n\n");
};

export function HighlightsScreen({ onNavigate }: HighlightsScreenProps = {}) {

  const {
    books,
    translation,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();

  const searchQuery = useHighlightsPreferencesStore((state) => state.searchQuery);
  const selectedColor = useHighlightsPreferencesStore((state) => state.selectedColor);
  const tabValue = useHighlightsPreferencesStore((state) => state.tabValue);
  const setSearchQuery = useHighlightsPreferencesStore((state) => state.setSearchQuery);
  const setSelectedColor = useHighlightsPreferencesStore((state) => state.setSelectedColor);
  const setTabValue = useHighlightsPreferencesStore((state) => state.setTabValue);

  const highlightsQuery = useHighlightsQuery(translationCode);
  const deleteMutation = useDeleteHighlightMutation(translationCode);
  const recolorMutation = useRecolorHighlightMutation(translationCode);
  const highlights = highlightsQuery.data ?? [];
  const { refetch: refetchHighlights } = highlightsQuery;

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler: EventListener = (event) => {
      const custom = event as CustomEvent<{ source?: string }>;
      if (custom.detail?.source === "highlights-screen") {
        return;
      }

      void refetchHighlights();
    };

    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(HIGHLIGHTS_UPDATED_EVENT, handler);
    };
  }, [refetchHighlights]);

  useEffect(() => {
    if (highlightsQuery.isError && highlightsQuery.error) {
      const message =
        highlightsQuery.error instanceof Error
          ? highlightsQuery.error.message
          : "Failed to load highlights";
      toast.error(message);
    }
  }, [highlightsQuery.error, highlightsQuery.isError]);

  const passageRequests = useMemo(
    () =>
      highlights.map((highlight) => {
        const book = highlight.bookId ? bookIndex.get(highlight.bookId) : undefined;
        return {
          id: highlight.id,
          bookName: book?.name,
          chapter: highlight.chapter,
          verseStart: highlight.verseStart,
          verseEnd: highlight.verseEnd,
        };
      }),
    [bookIndex, highlights],
  );

  const verseTexts = usePassageTextsMap(translationCode, passageRequests);

  const derivedHighlights = useMemo<HighlightViewModel[]>(() => {
    return highlights.map((highlight) => {
      const book = highlight.bookId ? bookIndex.get(highlight.bookId) : null;
      const referenceLabel = buildReferenceLabel(
        book ?? undefined,
        highlight.chapter,
        highlight.verseStart,
        highlight.verseEnd
      );
      return {
        raw: highlight,
        verseText: verseTexts[highlight.id] ?? "",
        referenceLabel,
        bookName: book?.name ?? "Unknown",
        color: highlight.color ?? "yellow",
        dateLabel: formatDate(highlight.updatedAt ?? highlight.createdAt),
      };
    });
  }, [highlights, bookIndex, verseTexts]);

  const filteredHighlights = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return derivedHighlights.filter((highlight) => {
      const colorMatches =
        selectedColor === "all" || highlight.color === selectedColor;

      if (!colorMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        highlight.bookName.toLowerCase().includes(query) ||
        (highlight.verseText && highlight.verseText.toLowerCase().includes(query)) ||
        (highlight.referenceLabel && highlight.referenceLabel.toLowerCase().includes(query))
      );
    });
  }, [derivedHighlights, searchQuery, selectedColor]);

  const highlightsByBook = useMemo(() => {
    return filteredHighlights.reduce<Record<string, HighlightViewModel[]>>(
      (accumulator, highlight) => {
        const key = highlight.bookName;
        if (!accumulator[key]) {
          accumulator[key] = [];
        }
        accumulator[key]!.push(highlight);
        return accumulator;
      },
      {}
    );
  }, [filteredHighlights]);

  const handleDeleteHighlight = async (highlight: UserHighlight) => {
    try {
      await deleteMutation.mutateAsync(highlight);
      toast.success("Removed from favorites");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove highlight";
      toast.error(message);
    }
  };

  const handleReapplyColor = async (highlight: UserHighlight, color: string) => {
    try {
      await recolorMutation.mutateAsync({
        highlight,
        color,
        translationId:
          highlight.translationId ?? translation?.id ?? translationCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update highlight";
      toast.error(message);
    }
  };

  const handleExportHighlights = useCallback(() => {
    if (derivedHighlights.length === 0) {
      toast.info("No favorites to export just yet.");
      return;
    }

    try {
      const translationLabel = translation?.name ?? translationCode ?? undefined;
      const exportText = formatHighlightsPlaintext(derivedHighlights, translationLabel);
      const blob = new Blob([exportText], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      link.download = `favorites-${timestamp}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Favorites exported as text");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to export favorites";
      toast.error(message);
    }
  }, [derivedHighlights, translation?.name, translationCode]);

  const renderHighlightCard = (highlight: HighlightViewModel) => {
    return (
      <article
        key={highlight.raw.id}
        className={clsx(styles.highlightCard, resolveAccentClass(highlight.color))}
      >
        <div className={styles.highlightAccent} aria-hidden="true" />
        <div className={styles.highlightBody}>
          <header className={styles.highlightCardHeader}>
            <div className={styles.highlightCardHeading}>
              <p className={styles.highlightCardTitle}>
                {highlight.referenceLabel ?? "Reference"}
              </p>
              <p className={styles.highlightCardMeta}>
                <span className={styles.highlightCardMetaItem}>
                  <Calendar className={styles.metaIcon} aria-hidden="true" />
                  {highlight.dateLabel ?? "Recently"}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`${controls.btnIconDanger} ${styles.deleteButton}`}
              onClick={() => handleDeleteHighlight(highlight.raw)}
              aria-label={`Remove ${highlight.referenceLabel ?? "favorite"}`}
            >
              <Trash2 className={styles.metaIcon} aria-hidden="true" />
            </Button>
          </header>

          <blockquote className={styles.highlightQuote}>
            <span className={styles.highlightQuoteMark} aria-hidden="true">
              “
            </span>
            <p className={styles.highlightQuoteText}>
              {highlight.verseText || "Highlight text unavailable."}
            </p>
          </blockquote>

          <footer className={styles.cardMetaFooter}>
            <span className={styles.colorPickerLabel}>Mark color</span>
            <div className={styles.colorOptions} role="group" aria-label="Highlight color">
              {availableFilterColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={clsx(
                    styles.colorOption,
                    colorToneClasses[color],
                    color === highlight.color && styles.colorOptionActive,
                  )}
                  onClick={() => handleReapplyColor(highlight.raw, color)}
                  title={`Set color to ${color}`}
                  aria-label={`Set color to ${color}`}
                  aria-pressed={color === highlight.color}
                />
              ))}
            </div>
          </footer>
        </div>
      </article>
    );
  };

  const busy =
    isLoadingTranslations ||
    isLoadingBooks ||
    !translationCode ||
    highlightsQuery.isLoading;

  return (
    <div className={styles.highlightsPage}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.headerCopy}>
            <h1 className={styles.headerTitle}>Favorites</h1>
            <p className={styles.headerSubtitle}>
              {filteredHighlights.length} shown • {highlights.length} total
              favorites
            </p>
          </div>
          <AppHeaderToolbar
            onNavigateProfile={() => onNavigate?.("settings")}
          />
        </div>

        <div className={styles.searchRow}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} aria-hidden="true" />
            <Input
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={`${controls.control} ${styles.searchInput}`}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportHighlights}
            className={`${controls.btnIcon} ${styles.exportButton}`}
            aria-label="Export favorites"
            title="Export"
          >
            <Share className={styles.toolbarIcon} aria-hidden="true" />
          </Button>
        </div>

        <div className={styles.filters} role="group" aria-label="Filter by color">
          <Filter className={styles.filterIcon} aria-hidden="true" />
          <button
            type="button"
            onClick={() => setSelectedColor("all")}
            className={clsx(
              styles.filterAll,
              selectedColor === "all" && styles.filterAllActive,
            )}
            aria-pressed={selectedColor === "all"}
          >
            All
          </button>
          <div className={styles.colorFilterRow}>
            {availableFilterColors.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setSelectedColor(color)}
                className={clsx(
                  styles.colorFilterSwatch,
                  colorToneClasses[color],
                  selectedColor === color && styles.colorFilterSwatchActive,
                )}
                aria-label={`Filter ${color}`}
                aria-pressed={selectedColor === color}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.contentArea}>
        {busy ? (
          <LoadingScreen
            variant="section"
            title="Loading favorites…"
            subtitle="We’re fetching your favorites and colour filters."
          />
        ) : filteredHighlights.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyBadge}>
              <Image
                src="/sword_logo.png"
                alt="Sword logo"
                width={88}
                height={88}
                className={styles.emptyBadgeImage}
              />
            </div>
            <h3 className={styles.emptyTitle}>No favorites match your filters</h3>
            <p className={styles.emptyCopy}>
              Try adjusting your search or colour filter—or capture a new highlight to see it here.
            </p>
          </div>
        ) : (
          <Tabs
            value={tabValue}
            onValueChange={(value) => setTabValue(value as HighlightTab)}
            className={styles.tabs}
          >
            <TabsList data-active={tabValue} className={styles.tabsList}>
              <span className={styles.tabHighlight} aria-hidden="true" />
              <TabsTrigger value="timeline" className={styles.tabTrigger}>
                Timeline
              </TabsTrigger>
              <TabsTrigger value="by-book" className={styles.tabTrigger}>
                By Book
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className={styles.tabsContent}>
              {filteredHighlights.map((highlight, index) => (
                <motion.div
                  key={highlight.raw.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className={styles.timelineItem}
                >
                  {renderHighlightCard(highlight)}
                </motion.div>
              ))}
            </TabsContent>
            <TabsContent value="by-book" className={styles.tabsContent}>
              {Object.entries(highlightsByBook).map(([book, entries]) => (
                <motion.div
                  key={book}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={styles.groupSection}
                >
                  <div className={styles.groupHeader}>
                    <h2 className={styles.groupTitle}>{book}</h2>
                    <Badge variant="secondary" className={styles.groupBadge}>
                      {entries.length}
                    </Badge>
                  </div>
                  <div className={styles.groupList}>
                    {entries.map((highlight) => renderHighlightCard(highlight))}
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
