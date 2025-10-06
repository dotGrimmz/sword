import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Search, Heart, BookOpen, Calendar, Filter, Share } from "lucide-react";
import { motion } from "motion/react";

interface HighlightsScreenProps {
  onNavigate: (screen: string) => void;
}

interface Highlight {
  id: string;
  verse: string;
  reference: string;
  book: string;
  chapter: number;
  verseNum: number;
  date: string;
  color: string;
  note?: string;
}

export function HighlightsScreen({ onNavigate }: HighlightsScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState("all");
  
  const [highlights] = useState<Highlight[]>([
    {
      id: "1",
      verse: "Blessed are those who mourn, for they shall be comforted.",
      reference: "Matthew 5:4",
      book: "Matthew",
      chapter: 5,
      verseNum: 4,
      date: "Oct 5, 2024",
      color: "blue",
      note: "God's comfort in times of sorrow"
    },
    {
      id: "2",
      verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
      reference: "Jeremiah 29:11",
      book: "Jeremiah",
      chapter: 29,
      verseNum: 11,
      date: "Oct 3, 2024",
      color: "yellow",
      note: "God's good plans for my life"
    },
    {
      id: "3",
      verse: "And we know that for those who love God all things work together for good, for those who are called according to his purpose.",
      reference: "Romans 8:28",
      book: "Romans",
      chapter: 8,
      verseNum: 28,
      date: "Oct 2, 2024",
      color: "green"
    },
    {
      id: "4",
      verse: "The Lord your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing.",
      reference: "Zephaniah 3:17",
      book: "Zephaniah",
      chapter: 3,
      verseNum: 17,
      date: "Sep 30, 2024",
      color: "pink"
    },
    {
      id: "5",
      verse: "Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!",
      reference: "Psalm 46:10",
      book: "Psalms",
      chapter: 46,
      verseNum: 10,
      date: "Sep 28, 2024",
      color: "blue",
      note: "Peace in God's sovereignty"
    }
  ]);

  const colorClasses = {
    blue: "bg-blue-100 border-blue-300 text-blue-800",
    yellow: "bg-yellow-100 border-yellow-300 text-yellow-800",
    green: "bg-green-100 border-green-300 text-green-800",
    pink: "bg-pink-100 border-pink-300 text-pink-800",
    purple: "bg-purple-100 border-purple-300 text-purple-800"
  };

  const filteredHighlights = highlights.filter(highlight => {
    const matchesSearch = highlight.verse.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         highlight.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         highlight.note?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesColor = selectedColor === "all" || highlight.color === selectedColor;
    return matchesSearch && matchesColor;
  });

  const groupedByBook = filteredHighlights.reduce((acc, highlight) => {
    if (!acc[highlight.book]) {
      acc[highlight.book] = [];
    }
    acc[highlight.book].push(highlight);
    return acc;
  }, {} as Record<string, Highlight[]>);

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-primary">My Highlights</h1>
          <Button variant="ghost" size="sm">
            <Share className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search highlights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input-background border-border/50"
          />
        </div>

        {/* Color Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Button
            variant={selectedColor === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedColor("all")}
            className="flex-shrink-0"
          >
            All
          </Button>
          {["blue", "yellow", "green", "pink"].map((color) => (
            <Button
              key={color}
              variant={selectedColor === color ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedColor(color)}
              className="flex-shrink-0"
            >
              <div className={`w-3 h-3 rounded-full mr-1 ${color === 'blue' ? 'bg-blue-400' : color === 'yellow' ? 'bg-yellow-400' : color === 'green' ? 'bg-green-400' : 'bg-pink-400'}`} />
              {color.charAt(0).toUpperCase() + color.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 bg-card/60">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="by-book">By Book</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="p-4 space-y-4">
            {filteredHighlights.map((highlight, index) => (
              <motion.div
                key={highlight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className={`border-2 ${colorClasses[highlight.color as keyof typeof colorClasses]} hover:shadow-md transition-all duration-200`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm text-primary flex items-center space-x-2">
                          <BookOpen className="w-3 h-3" />
                          <span>{highlight.reference}</span>
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-1 text-xs mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{highlight.date}</span>
                        </CardDescription>
                      </div>
                      <Heart className="w-4 h-4 text-accent fill-accent" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <blockquote className="scripture-text text-base leading-relaxed text-foreground">
                      "{highlight.verse}"
                    </blockquote>
                    {highlight.note && (
                      <div className="bg-background/50 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground italic">
                          {highlight.note}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
          
          <TabsContent value="by-book" className="p-4 space-y-6">
            {Object.entries(groupedByBook).map(([book, bookHighlights]) => (
              <motion.div
                key={book}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg text-primary">{book}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {bookHighlights.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {bookHighlights.map((highlight) => (
                      <Card key={highlight.id} className={`border ${colorClasses[highlight.color as keyof typeof colorClasses]} hover:shadow-md transition-all duration-200`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm text-primary">{highlight.reference}</span>
                            <span className="text-xs text-muted-foreground">{highlight.date}</span>
                          </div>
                          <blockquote className="scripture-text text-sm leading-relaxed text-foreground">
                            "{highlight.verse}"
                          </blockquote>
                          {highlight.note && (
                            <p className="text-xs text-muted-foreground italic mt-2 bg-background/50 rounded p-2">
                              {highlight.note}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}