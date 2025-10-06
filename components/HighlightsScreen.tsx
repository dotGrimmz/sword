"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  BookOpen,
  Calendar,
  Filter,
  Heart,
  Loader2,
  Search,
  Share,
  Trash2,
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  createUserHighlight,
  deleteUserHighlight,
  getUserHighlights,
} from "@/lib/api/highlights";
import { buildReferenceLabel, getPassage } from "@/lib/api/bible";
import type { BibleBookSummary } from "@/types/bible";
import type { UserHighlight } from "@/types/user";
import {
  HIGHLIGHTS_UPDATED_EVENT,
  dispatchHighlightsUpdated,
} from "@/lib/events";

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

const colorClasses: Record<string, string> = {
  blue: "bg-blue-100 border-blue-200 text-blue-800",
  yellow: "bg-yellow-100 border-yellow-200 text-yellow-800",
  green: "bg-green-100 border-green-200 text-green-800",
  pink: "bg-pink-100 border-pink-200 text-pink-800",
  purple: "bg-purple-100 border-purple-200 text-purple-800",
};

const fallbackColorClasses = "bg-amber-100 border-amber-200 text-amber-800";

const availableFilterColors = ["blue", "yellow", "green", "pink", "purple"] as const;

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

export function HighlightsScreen({ onNavigate }: HighlightsScreenProps = {}) {
  void onNavigate;

  const {
    books,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});

  const verseTextsRef = useRef(verseTexts);
  const pendingPassages = useRef(new Set<string>());

  useEffect(() => {
    verseTextsRef.current = verseTexts;
  }, [verseTexts]);

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

  const loadHighlights = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserHighlights();
      setHighlights(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load highlights";
      toast.error(message);
      setHighlights([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHighlights();
  }, [loadHighlights]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler: EventListener = (event) => {
      const custom = event as CustomEvent<{ source?: string }>;
      if (custom.detail?.source === "highlights-screen") {
        return;
      }

      void loadHighlights();
    };

    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(HIGHLIGHTS_UPDATED_EVENT, handler);
    };
  }, [loadHighlights]);

  useEffect(() => {
    if (!translationCode) {
      return;
    }

    for (const highlight of highlights) {
      const key = highlight.id;
      if (verseTextsRef.current[key] !== undefined) {
        continue;
      }

      if (pendingPassages.current.has(key)) {
        continue;
      }

      const book = highlight.bookId ? bookIndex.get(highlight.bookId) : null;

      if (!book) {
        setVerseTexts((prev) => ({ ...prev, [key]: "" }));
        continue;
      }

      pendingPassages.current.add(key);

      void getPassage(
        translationCode,
        book.name,
        { chapter: highlight.chapter, verse: highlight.verseStart },
        {
          chapter: highlight.chapter,
          verse: highlight.verseEnd,
        }
      )
        .then((response) => {
          const text = response.verses.map((entry) => entry.text).join(" ");
          setVerseTexts((prev) => ({ ...prev, [key]: text }));
        })
        .catch(() => {
          setVerseTexts((prev) => ({ ...prev, [key]: "" }));
        })
        .finally(() => {
          pendingPassages.current.delete(key);
        });
    }
  }, [highlights, translationCode, bookIndex]);

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
    setHighlights((prev) => prev.filter((item) => item.id !== highlight.id));

    try {
      await deleteUserHighlight(highlight.id);
      toast.success("Highlight removed");
      dispatchHighlightsUpdated({ source: "highlights-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove highlight";
      toast.error(message);
      setHighlights(previous);
    }
  };

  const handleReapplyColor = async (highlight: UserHighlight, color: string) => {
    // simple reapply via recreate highlight with new color
    const previous = highlights;
    setHighlights((prev) =>
      prev.map((item) => (item.id === highlight.id ? { ...item, color } : item))
    );

    try {
      await deleteUserHighlight(highlight.id);
      const recreated = await createUserHighlight({
        bookId: highlight.bookId,
        chapter: highlight.chapter,
        verseStart: highlight.verseStart,
        verseEnd: highlight.verseEnd,
        color,
      });
      setHighlights((prev) => [recreated, ...prev.filter((item) => item.id !== highlight.id)]);
      dispatchHighlightsUpdated({ source: "highlights-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update highlight";
      toast.error(message);
      setHighlights(previous);
    }
  };

  const renderHighlightCard = (highlight: HighlightViewModel) => {
    const colorBadge = colorClasses[highlight.color] ?? fallbackColorClasses;
    return (
      <Card
        key={highlight.raw.id}
        className={`border ${colorBadge} hover:shadow-md transition-all duration-200`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm text-primary flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                {highlight.referenceLabel ?? "Reference"}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {highlight.dateLabel ?? "Recently"}
                </span>
                <span className="text-muted-foreground">{highlight.bookName}</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDeleteHighlight(highlight.raw)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <blockquote className="scripture-text text-base leading-relaxed text-foreground">
            “{highlight.verseText || "Highlight text unavailable."}”
          </blockquote>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Heart className="h-3.5 w-3.5 text-accent" />
            <span>{highlight.color.toUpperCase()}</span>
            <div className="flex gap-1">
              {availableFilterColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`h-4 w-4 rounded-full border border-border/40 transition ${
                    color === highlight.color ? "ring-2 ring-accent" : ""
                  } ${
                    color === "blue"
                      ? "bg-blue-400"
                      : color === "yellow"
                        ? "bg-yellow-400"
                        : color === "green"
                          ? "bg-green-400"
                          : color === "pink"
                            ? "bg-pink-400"
                            : "bg-purple-400"
                  }`}
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

  const busy = isLoading || isLoadingTranslations || isLoadingBooks;

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-primary">My Highlights</h1>
            <p className="text-xs text-muted-foreground">
              {filteredHighlights.length} shown • {highlights.length} total saved
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search highlights..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10 bg-input-background border-border/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Button
            variant={selectedColor === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedColor("all")}
          >
            All colors
          </Button>
          {availableFilterColors.map((color) => (
            <Button
              key={color}
              variant={selectedColor === color ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedColor(color)}
            >
              <span
                className={`mr-2 inline-block h-3 w-3 rounded-full ${
                  color === "blue"
                    ? "bg-blue-400"
                    : color === "yellow"
                      ? "bg-yellow-400"
                      : color === "green"
                        ? "bg-green-400"
                        : color === "pink"
                          ? "bg-pink-400"
                          : "bg-purple-400"
                }`}
              />
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {busy ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading highlights...
          </div>
        ) : filteredHighlights.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md text-center text-muted-foreground">
            <p className="text-sm">No highlights match your filters yet.</p>
          </div>
        ) : (
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2 bg-card/60">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="by-book">By Book</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="p-4 space-y-4">
              {filteredHighlights.map((highlight, index) => (
                <motion.div
                  key={highlight.raw.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                >
                  {renderHighlightCard(highlight)}
                </motion.div>
              ))}
            </TabsContent>
            <TabsContent value="by-book" className="p-4 space-y-6">
              {Object.entries(highlightsByBook).map(([book, entries]) => (
                <motion.div
                  key={book}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg text-primary">{book}</h2>
                      <Badge variant="secondary" className="text-xs">
                        {entries.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {entries.map((highlight) => renderHighlightCard(highlight))}
                    </div>
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
