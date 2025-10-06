import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Plus, Brain, CheckCircle, RotateCcw, Target, Calendar } from "lucide-react";
import { motion } from "motion/react";

interface MemoryScreenProps {
  onNavigate: (screen: string) => void;
}

interface MemoryVerse {
  id: string;
  verse: string;
  reference: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  mastery: number;
  lastReviewed: string;
  nextReview: string;
  streak: number;
}

export function MemoryScreen({ onNavigate }: MemoryScreenProps) {
  const [currentMode, setCurrentMode] = useState<"review" | "practice" | "list">("list");
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  
  const [memoryVerses] = useState<MemoryVerse[]>([
    {
      id: "1",
      verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
      reference: "Jeremiah 29:11",
      category: "Hope",
      difficulty: "medium",
      mastery: 85,
      lastReviewed: "Oct 4, 2024",
      nextReview: "Oct 6, 2024",
      streak: 7
    },
    {
      id: "2",
      verse: "And we know that for those who love God all things work together for good, for those who are called according to his purpose.",
      reference: "Romans 8:28",
      category: "God's Sovereignty",
      difficulty: "hard",
      mastery: 65,
      lastReviewed: "Oct 3, 2024",
      nextReview: "Oct 5, 2024",
      streak: 4
    },
    {
      id: "3",
      verse: "Be still, and know that I am God.",
      reference: "Psalm 46:10",
      category: "Peace",
      difficulty: "easy",
      mastery: 95,
      lastReviewed: "Oct 5, 2024",
      nextReview: "Oct 8, 2024",
      streak: 12
    },
    {
      id: "4",
      verse: "I can do all things through him who strengthens me.",
      reference: "Philippians 4:13",
      category: "Strength",
      difficulty: "easy",
      mastery: 90,
      lastReviewed: "Oct 2, 2024",
      nextReview: "Oct 6, 2024",
      streak: 9
    },
    {
      id: "5",
      verse: "Trust in the Lord with all your heart, and do not lean on your own understanding.",
      reference: "Proverbs 3:5",
      category: "Trust",
      difficulty: "medium",
      mastery: 75,
      lastReviewed: "Oct 1, 2024",
      nextReview: "Oct 5, 2024",
      streak: 5
    }
  ]);

  const needReview = memoryVerses.filter(v => new Date(v.nextReview) <= new Date());
  const totalMastery = Math.round(memoryVerses.reduce((sum, v) => sum + v.mastery, 0) / memoryVerses.length);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const startReview = () => {
    setCurrentMode("review");
    setCurrentVerseIndex(0);
    setShowAnswer(false);
  };

  const nextVerse = () => {
    if (currentVerseIndex < needReview.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1);
      setShowAnswer(false);
    } else {
      setCurrentMode("list");
    }
  };

  if (currentMode === "review" && needReview.length > 0) {
    const currentVerse = needReview[currentVerseIndex];
    return (
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
        <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setCurrentMode("list")}>
              ← Back to List
            </Button>
            <div className="text-center">
              <h2 className="text-lg text-primary">Review Session</h2>
              <p className="text-sm text-muted-foreground">
                {currentVerseIndex + 1} of {needReview.length}
              </p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            key={currentVerse.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="border-accent/30 bg-card/90">
              <CardHeader className="text-center">
                <CardTitle className="text-primary">{currentVerse.reference}</CardTitle>
                <CardDescription>{currentVerse.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!showAnswer ? (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Try to recite this verse from memory</p>
                    <Button onClick={() => setShowAnswer(true)}>
                      Show Verse
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <blockquote className="scripture-text text-base leading-relaxed text-center italic">
                      "{currentVerse.verse}"
                    </blockquote>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={nextVerse}
                      >
                        Hard 😔
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={nextVerse}
                      >
                        Good 🙂
                      </Button>
                      <Button 
                        className="flex-1 bg-primary hover:bg-primary/90"
                        onClick={nextVerse}
                      >
                        Perfect! 🎉
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-primary">Memory Verses</h1>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" />
            Add Verse
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-3 bg-card/60">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="text-lg font-medium text-foreground">{memoryVerses.length}</div>
              <div className="text-xs text-muted-foreground">Total Verses</div>
            </div>
          </Card>
          <Card className="p-3 bg-card/60">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Target className="w-4 h-4 text-accent" />
              </div>
              <div className="text-lg font-medium text-foreground">{totalMastery}%</div>
              <div className="text-xs text-muted-foreground">Avg Mastery</div>
            </div>
          </Card>
          <Card className="p-3 bg-card/60">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <RotateCcw className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-lg font-medium text-foreground">{needReview.length}</div>
              <div className="text-xs text-muted-foreground">Need Review</div>
            </div>
          </Card>
        </div>

        {needReview.length > 0 && (
          <Button onClick={startReview} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Start Review Session ({needReview.length} verses)
          </Button>
        )}
      </div>

      {/* Verses List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        {memoryVerses.map((verse, index) => (
          <motion.div
            key={verse.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="border-border/50 bg-card/80 hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base text-primary flex items-center space-x-2">
                      <span>{verse.reference}</span>
                      {verse.mastery >= 90 && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{verse.category}</Badge>
                      <Badge className={`text-xs ${getDifficultyColor(verse.difficulty)}`}>
                        {verse.difficulty}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Streak: {verse.streak}</div>
                    <div className="text-xs text-muted-foreground">Next: {verse.nextReview}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <blockquote className="scripture-text text-sm leading-relaxed text-foreground">
                  "{verse.verse}"
                </blockquote>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Mastery</span>
                    <span className="text-foreground">{verse.mastery}%</span>
                  </div>
                  <Progress value={verse.mastery} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}