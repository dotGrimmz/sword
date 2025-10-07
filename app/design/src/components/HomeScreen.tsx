import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { BookOpen, Heart, Lightbulb, Brain, Calendar, Clock } from "lucide-react";
import { motion } from "motion/react";

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const todaysVerse = {
    text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
    reference: "Jeremiah 29:11"
  };

  const studyProgress = [
    { book: "Psalms", progress: 45, color: "bg-chart-1" },
    { book: "Matthew", progress: 78, color: "bg-chart-2" },
    { book: "Romans", progress: 23, color: "bg-chart-3" }
  ];

  const quickActions = [
    { icon: BookOpen, label: "Continue Reading", screen: "reader", subtitle: "Matthew 5:12" },
    { icon: Heart, label: "My Highlights", screen: "highlights", subtitle: "23 verses saved" },
    { icon: Lightbulb, label: "Study Notes", screen: "notes", subtitle: "12 notes" },
    { icon: Brain, label: "Memory Verses", screen: "memory", subtitle: "5 to review" }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-20 bg-gradient-to-b from-background to-secondary/10">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl text-primary">Good morning</h1>
          <p className="text-muted-foreground">Let's dive into His Word together</p>
        </div>

        {/* Today's Verse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-accent/30 bg-gradient-to-r from-card to-secondary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-accent" />
                <CardTitle className="text-sm text-accent">Today's Verse</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <blockquote className="scripture-text text-base leading-relaxed text-foreground mb-3 italic">
                "{todaysVerse.text}"
              </blockquote>
              <cite className="text-sm text-primary">— {todaysVerse.reference}</cite>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg text-foreground">Continue Your Journey</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.screen}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 bg-card/80"
                  onClick={() => onNavigate(action.screen)}
                >
                  <CardContent className="p-4 space-y-2">
                    <action.icon className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle className="text-sm">{action.label}</CardTitle>
                      <CardDescription className="text-xs">{action.subtitle}</CardDescription>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Study Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Reading Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studyProgress.map((study) => (
                <div key={study.book} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{study.book}</span>
                    <span className="text-muted-foreground">{study.progress}%</span>
                  </div>
                  <Progress value={study.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base">Recent Reflections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground">Yesterday</p>
                <p className="scripture-text text-foreground">Added note on Matthew 5:4 about comfort...</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">2 days ago</p>
                <p className="scripture-text text-foreground">Highlighted Romans 8:28 - All things work together...</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}