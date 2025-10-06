"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { ChevronLeft, ChevronRight, Bookmark, Heart, MessageSquare, Settings } from "lucide-react";
import { motion } from "motion/react";

interface BibleReaderScreenProps {
  onNavigate?: (screen: string) => void;
}

export function BibleReaderScreen({ onNavigate }: BibleReaderScreenProps) {
  const handleNavigate = (screen: string) => {
    onNavigate?.(screen);
  };

  const [currentChapter, setCurrentChapter] = useState({ book: "Matthew", chapter: 5 });
  const [highlightedVerses, setHighlightedVerses] = useState<number[]>([4, 8]);

  const verses = [
    { number: 1, text: "Seeing the crowds, he went up on the mountain, and when he sat down, his disciples came to him." },
    { number: 2, text: "And he opened his mouth and taught them, saying:" },
    { number: 3, text: "Blessed are the poor in spirit, for theirs is the kingdom of heaven." },
    { number: 4, text: "Blessed are those who mourn, for they shall be comforted." },
    { number: 5, text: "Blessed are the meek, for they shall inherit the earth." },
    { number: 6, text: "Blessed are those who hunger and thirst for righteousness, for they shall be satisfied." },
    { number: 7, text: "Blessed are the merciful, for they shall receive mercy." },
    { number: 8, text: "Blessed are the pure in heart, for they shall see God." },
    { number: 9, text: "Blessed are the peacemakers, for they shall be called sons of God." },
    { number: 10, text: "Blessed are those who are persecuted for righteousness' sake, for theirs is the kingdom of heaven." }
  ];

  const toggleHighlight = (verseNumber: number) => {
    setHighlightedVerses(prev => 
      prev.includes(verseNumber) 
        ? prev.filter(v => v !== verseNumber)
        : [...prev, verseNumber]
    );
  };

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Select value={currentChapter.book}>
              <SelectTrigger className="w-32 bg-input-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Matthew">Matthew</SelectItem>
                <SelectItem value="Mark">Mark</SelectItem>
                <SelectItem value="Luke">Luke</SelectItem>
                <SelectItem value="John">John</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currentChapter.chapter.toString()}>
              <SelectTrigger className="w-20 bg-input-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleNavigate("settings")}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <h1 className="text-lg text-primary">{currentChapter.book} {currentChapter.chapter}</h1>
          <Button variant="ghost" size="sm">
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Scripture Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {verses.map((verse, index) => (
            <motion.div
              key={verse.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`group relative cursor-pointer p-4 rounded-lg transition-all duration-200 ${
                highlightedVerses.includes(verse.number)
                  ? 'bg-accent/20 border-l-4 border-accent'
                  : 'hover:bg-card/60'
              }`}
              onClick={() => toggleHighlight(verse.number)}
            >
              <div className="flex space-x-3">
                <span className="text-sm text-primary min-w-[2rem] scripture-text font-medium">
                  {verse.number}
                </span>
                <p className="scripture-text text-base leading-relaxed text-foreground flex-1">
                  {verse.text}
                </p>
              </div>
              
              {/* Action buttons - shown on highlight */}
              {highlightedVerses.includes(verse.number) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-2 top-2 flex space-x-1"
                >
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Heart className="w-3 h-3 text-accent" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <MessageSquare className="w-3 h-3 text-accent" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Bookmark className="w-3 h-3 text-accent" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        <Separator className="my-8" />
        
        {/* Chapter Summary */}
        <Card className="border-border/50 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base text-primary">Chapter Reflection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Beatitudes present Jesus' vision of the blessed life - one marked by spiritual poverty, 
              mourning over sin, meekness, and a hunger for righteousness. These characteristics seem 
              counterintuitive to worldly success, yet they reveal the heart of kingdom living.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
