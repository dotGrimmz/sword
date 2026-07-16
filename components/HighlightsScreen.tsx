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
import {
  BookOpen,
  Calendar,
  Filter,
  Heart,
  Search,
  Share,
  Trash2,
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { TranslationSwitcher } from "./TranslationSwitcher";
import { Button } from "./ui/button";
import controls from "@/components/realign/controls.module.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  createUserHighlight,
  deleteUserHighlight,
  getUserHighlights,
} from "@/lib/api/highlights";
import { buildReferenceLabel } from "@/lib/api/bible";
import type { BibleBookSummary } from "@/types/bible";
import type { UserHighlight } from "@/types/user";
import {
  HIGHLIGHTS_UPDATED_EVENT,
  dispatchHighlightsUpdated,
} from "@/lib/events";
import styles from "./HighlightsScreen.module.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
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

const cardColorClasses: Record<string, string> = {
  blue: styles.highlightCardBlue,
  yellow: styles.highlightCardYellow,
  green: styles.highlightCardGreen,
  pink: styles.highlightCardPink,
  purple: styles.highlightCardPurple,
};

const fallbackCardColorClass = styles.highlightCardFallback;

const colorSwatchClasses: Record<(typeof availableFilterColors)[number], string> = {
  blue: styles.colorSwatchBlue,
  yellow: styles.colorSwatchYellow,
  green: styles.colorSwatchGreen,
  pink: styles.colorSwatchPink,
  purple: styles.colorSwatchPurple,
};

const colorOptionClasses: Record<(typeof availableFilterColors)[number], string> = {
  blue: styles.colorOptionBlue,
  yellow: styles.colorOptionYellow,
  green: styles.colorOptionGreen,
  pink: styles.colorOptionPink,
  purple: styles.colorOptionPurple,
};

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
    "Marked Passages",
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
  void onNavigate;

  const {
    books,
    translation,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();

  const translationKey = translationCode ?? "none";
  const fetchEnabled = Boolean(translationCode);

  const searchQuery = useHighlightsPreferencesStore((state) => state.searchQuery);
  const selectedColor = useHighlightsPreferencesStore((state) => state.selectedColor);
  const tabValue = useHighlightsPreferencesStore((state) => state.tabValue);
  const setSearchQuery = useHighlightsPreferencesStore((state) => state.setSearchQuery);
  const setSelectedColor = useHighlightsPreferencesStore((state) => state.setSelectedColor);
  const setTabValue = useHighlightsPreferencesStore((state) => state.setTabValue);

  const queryClient = useQueryClient();
  const highlightsQueryKey = queryKeys.userHighlights(translationKey);

  const highlightsQuery = useQuery({
    queryKey: highlightsQueryKey,
    queryFn: () => getUserHighlights(translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: fetchEnabled,
  });
  const highlights = useMemo(
    () => highlightsQuery.data ?? [],
    [highlightsQuery.data],
  );

  const setHighlightsCache = useCallback(
    (
      value:
        | UserHighlight[]
        | ((previous: UserHighlight[] | undefined) => UserHighlight[]),
    ) => {
      queryClient.setQueryData<UserHighlight[]>(highlightsQueryKey, value);
    },
    [highlightsQueryKey, queryClient],
  );
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
    const previous = highlights;
    setHighlightsCache((prev) => (prev ?? []).filter((item) => item.id !== highlight.id));

    try {
      await deleteUserHighlight(highlight.id);
      toast.success("Mark removed");
      dispatchHighlightsUpdated({ source: "highlights-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove highlight";
      toast.error(message);
      setHighlightsCache(() => previous);
    }
  };

  const handleReapplyColor = async (highlight: UserHighlight, color: string) => {
    // simple reapply via recreate highlight with new color
    const previous = highlights;
    setHighlightsCache((prev) =>
      (prev ?? []).map((item) => (item.id === highlight.id ? { ...item, color } : item))
    );

    try {
      await deleteUserHighlight(highlight.id);
      const translationIdentifier =
        highlight.translationId ?? translation?.id ?? translationCode ?? null;

      if (!translationIdentifier) {
        throw new Error("Translation unavailable for this highlight.");
      }

      const recreated = await createUserHighlight({
        translationId: translationIdentifier,
        bookId: highlight.bookId,
        chapter: highlight.chapter,
        verseStart: highlight.verseStart,
        verseEnd: highlight.verseEnd,
        color,
      });
      setHighlightsCache((prev) => [
        recreated,
        ...((prev ?? []).filter((item) => item.id !== highlight.id)),
      ]);
      dispatchHighlightsUpdated({ source: "highlights-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update highlight";
      toast.error(message);
      setHighlightsCache(() => previous);
    }
  };

  const handleExportHighlights = useCallback(() => {
    if (derivedHighlights.length === 0) {
      toast.info("No marked passages to export just yet.");
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
      link.download = `highlights-${timestamp}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Marked passages exported as text");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to export marked passages";
      toast.error(message);
    }
  }, [derivedHighlights, translation?.name, translationCode]);

  const renderHighlightCard = (highlight: HighlightViewModel) => {
    const colorClass = cardColorClasses[highlight.color] ?? fallbackCardColorClass;
    return (
      <Card
        key={highlight.raw.id}
        className={clsx(styles.highlightCard, colorClass)}
      >
        <CardHeader className={styles.highlightCardHeader}>
          <div className={styles.highlightCardHeaderRow}>
            <div className={styles.highlightCardHeading}>
              <CardTitle className={styles.highlightCardTitle}>
                <BookOpen className={styles.metaIcon} />
                {highlight.referenceLabel ?? "Reference"}
              </CardTitle>
              <CardDescription className={styles.highlightCardMeta}>
                <span className={styles.highlightCardMetaItem}>
                  <Calendar className={styles.metaIcon} />
                  {highlight.dateLabel ?? "Recently"}
                </span>
                <span className={styles.highlightCardMetaItem}>{highlight.bookName}</span>
              </CardDescription>
            </div>
            <div>
              <Button
                variant="outline"
                size="icon"
                className={`${controls.btnIconDanger} ${styles.deleteButton}`}
                onClick={() => handleDeleteHighlight(highlight.raw)}
              >
                <Trash2 className={styles.metaIcon} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={styles.cardContent}>
          <blockquote className={clsx("scripture-text", styles.highlightQuote)}>
            “{highlight.verseText || "Highlight text unavailable."}”
          </blockquote>
          <div className={styles.cardMetaFooter}>
            <Heart className={styles.cardMetaIcon} />
            <span className={styles.colorLabel}>{highlight.color.toUpperCase()}</span>
            <div className={styles.colorOptions}>
              {availableFilterColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={clsx(
                    styles.colorOption,
                    colorOptionClasses[color],
                    color === highlight.color && styles.colorOptionActive,
                  )}
                  onClick={() => handleReapplyColor(highlight.raw, color)}
                  title={`Set color to ${color}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const busy =
    isLoadingTranslations ||
    isLoadingBooks ||
    !fetchEnabled ||
    highlightsQuery.isLoading;

  return (
    <div className={styles.highlightsPage}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.headerCopy}>
            <h1 className={styles.headerTitle}>Marked</h1>
            <p className={styles.headerSubtitle}>
              {filteredHighlights.length} shown • {highlights.length} total marked
            </p>
          </div>
          <TranslationSwitcher
            className={styles.translationControl}
            size="compact"
            hideLabel
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportHighlights}
            className={`${controls.btnIcon} ${styles.exportButton}`}
            aria-label="Export marked passages"
          >
            <Share className={styles.toolbarIcon} />
          </Button>
        </div>

        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} />
          <Input
            placeholder="Search marked passages..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`${controls.control} ${styles.searchInput}`}
          />
        </div>

        <div className={styles.filters}>
          <Filter className={styles.filterIcon} />
          <Button
            variant="outline"
            onClick={() => setSelectedColor("all")}
            className={clsx(
              controls.chip,
              styles.filterButton,
              selectedColor === "all" && controls.chipActive,
            )}
          >
            All colors
          </Button>
          {availableFilterColors.map((color) => (
            <Button
              key={color}
              variant="outline"
              onClick={() => setSelectedColor(color)}
              className={clsx(
                controls.chip,
                styles.filterButton,
                selectedColor === color && controls.chipActive,
              )}
            >
              <span className={clsx(styles.colorSwatch, colorSwatchClasses[color])} />
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.contentArea}>
        {busy ? (
          <LoadingScreen
            variant="section"
            title="Loading marked passages…"
            subtitle="We’re fetching your marked passages and colour filters."
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
            <h3 className={styles.emptyTitle}>No marked passages match your filters</h3>
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
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="by-book">By Book</TabsTrigger>
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
