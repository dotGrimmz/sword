"use client";

import { Button } from "./ui/button";
import { Home, BookOpen, Heart, Brain, FileText, Settings } from "lucide-react";
import { motion } from "motion/react";

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "reader", icon: BookOpen, label: "Read" },
    { id: "highlights", icon: Heart, label: "Highlights" },
    { id: "memory", icon: Brain, label: "Memory" },
    { id: "notes", icon: FileText, label: "Notes" },
    { id: "settings", icon: Settings, label: "Settings" }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center h-14 relative ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -top-1 -left-1 -right-1 -bottom-1 bg-accent/20 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
              <span className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
