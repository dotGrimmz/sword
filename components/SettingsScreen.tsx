"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import {
  User,
  Book,
  Bell,
  Palette,
  Type,
  Moon,
  Sun,
  Download,
  Share,
  Shield,
  LogOut,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { useTheme, themeOptions } from "./ThemeContext";
import { createClient } from "@/lib/supabase/client";
import { clearCachedAccessToken } from "@/lib/api/session";

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps = {}) {
  void onNavigate;
  const router = useRouter();
  const [fontSize, setFontSize] = useState([16]);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoHighlight, setAutoHighlight] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();

  const settingSections = [
    {
      title: "Reading Experience",
      icon: Book,
      items: [
        {
          type: "select",
          label: "Bible Translation",
          description: "Choose your preferred translation",
          value: "ESV",
          options: ["ESV", "NIV", "NASB", "KJV", "NLT"],
        },
        {
          type: "slider",
          label: "Font Size",
          description: "Adjust text size for comfortable reading",
          value: fontSize,
          onChange: setFontSize,
          min: 12,
          max: 24,
        },
        {
          type: "select",
          label: "Reading Mode",
          description: "Single column or verse-by-verse",
          value: "verse",
          options: ["paragraph", "verse", "single-column"],
        },
      ],
    },
    {
      title: "Appearance",
      icon: Palette,
      items: [
        {
          type: "theme-select",
          label: "Color Theme",
          description: "Choose your vibrant color scheme",
          value: theme,
          onChange: setTheme,
        },
        {
          type: "switch",
          label: "Dark Mode",
          description: "Use dark theme for low-light reading",
          value: darkMode,
          onChange: setDarkMode,
        },
      ],
    },
    {
      title: "Study Tools",
      icon: Type,
      items: [
        {
          type: "switch",
          label: "Auto-Highlight",
          description: "Automatically highlight as you read",
          value: autoHighlight,
          onChange: setAutoHighlight,
        },
        {
          type: "select",
          label: "Default Note Color",
          description: "Your preferred highlight color",
          value: "yellow",
          options: ["yellow", "blue", "green", "pink", "purple"],
        },
        {
          type: "switch",
          label: "Show Cross-References",
          description: "Display related verses inline",
          value: true,
          onChange: () => {},
        },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          type: "switch",
          label: "Daily Reminders",
          description: "Get reminded for daily reading",
          value: notifications,
          onChange: setNotifications,
        },
        {
          type: "select",
          label: "Reminder Time",
          description: "When to send daily reminders",
          value: "8:00 AM",
          options: ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "8:00 PM"],
        },
        {
          type: "switch",
          label: "Memory Verse Alerts",
          description: "Reminders to review memory verses",
          value: true,
          onChange: () => {},
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, index: number) => {
    switch (item.type) {
      case "switch":
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            </div>
            <Switch checked={item.value} onCheckedChange={item.onChange} />
          </div>
        );
      case "theme-select":
        return (
          <div key={index} className="space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground">
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {themeOptions.map((themeOption) => (
                <motion.div
                  key={themeOption.value}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    item.value === themeOption.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-accent/50"
                  }`}
                  onClick={() => item.onChange(themeOption.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full ${themeOption.preview}`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {themeOption.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {themeOption.description}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      case "select":
        return (
          <div key={index} className="space-y-2">
            <div>
              <div className="text-sm font-medium text-foreground">
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            </div>
            <Select value={item.value}>
              <SelectTrigger className="bg-input-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {item.options.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "slider":
        return (
          <div key={index} className="space-y-3">
            <div>
              <div className="text-sm font-medium text-foreground flex justify-between">
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.value[0]}px
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            </div>
            <Slider
              value={item.value}
              onValueChange={item.onChange}
              min={item.min}
              max={item.max}
              step={1}
              className="w-full"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl text-primary">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Customize your study experience
            </p>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-6">
        {settingSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
          >
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center space-x-2">
                  <section.icon className="w-4 h-4 text-primary " />
                  <span>{section.title} kop</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    {renderSettingItem(item, itemIndex)}
                    {itemIndex < section.items.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Account & Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Account & Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Export My Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Share className="w-4 h-4 mr-2" />
                Share with Friends
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={async () => {
                  if (isSigningOut) {
                    return;
                  }

                  setIsSigningOut(true);
                  const supabase = createClient();

                  try {
                    const { error } = await supabase.auth.signOut();

                    if (error) {
                      throw error;
                    }

                    clearCachedAccessToken();
                    toast.success("Signed out");
                    router.replace("/login");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Unable to sign out";
                    toast.error(message);
                  } finally {
                    setIsSigningOut(false);
                  }
                }}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4 text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg text-primary">SWORD</h3>
              <p className="text-xs text-muted-foreground">
                Scripture • Wisdom • Order • Reflection • Devotion
              </p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
              <div className="flex justify-center space-x-4 pt-2">
                <Button variant="ghost" size="sm" className="text-xs">
                  Privacy Policy
                </Button>
                <Button variant="ghost" size="sm" className="text-xs">
                  Terms of Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
