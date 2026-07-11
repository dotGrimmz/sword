"use client";

import Image from "next/image";
import clsx from "clsx";
import {
  Book,
  BookOpen,
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Lightbulb,
  MessageSquare,
  Settings,
} from "lucide-react";

import { StitchCaptureShell } from "@/components/stitch-capture/StitchCaptureShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import readerStyles from "@/components/BibleReaderScreen.module.css";
import styles from "@/components/HomeScreen.module.css";

const quickActions = [
  {
    icon: BookOpen,
    label: "Open Scripture",
    subtitle: "New International Version active",
    detail: "Return to the passage you were studying.",
  },
  {
    icon: Heart,
    label: "Marked",
    subtitle: "12 saved",
    detail: "Review and reflect on verses you marked.",
  },
  {
    icon: Lightbulb,
    label: "Reflections",
    subtitle: "5 reflections",
    detail: "Capture insights and prayers in one place.",
  },
  {
    icon: Brain,
    label: "Memory Verses",
    subtitle: "2 need review",
    detail: "Strengthen recall with gentle spaced reviews.",
  },
  {
    icon: Book,
    label: "Pre-Read",
    subtitle: "Preview today's study",
    detail: "Read the passage, reflection prompts, and poll.",
  },
  {
    icon: Settings,
    label: "Profile",
    subtitle: "Manage your account and theme.",
    detail: "Update preferences, appearance, and profile info.",
  },
];

const progressData = [
  { label: "Notes captured", value: 42 },
  { label: "Highlights", value: 35 },
  { label: "Memory verses", value: 23 },
];

const recentNotes = [
  {
    id: "1",
    reference: "Philippians 3:12-14",
    excerpt: "Pressing on toward the goal — what does it mean to forget what is behind?",
    updatedLabel: "Jul 8",
  },
  {
    id: "2",
    reference: "Romans 12:2",
    excerpt: "Do not conform to the pattern of this world… transformation starts with the mind.",
    updatedLabel: "Jul 6",
  },
];

export function StitchCaptureToday() {
  return (
    <StitchCaptureShell currentScreen="home">
      <div className={styles.page}>
        <div className={styles.stack}>
          <div className={styles.headerStrip}>
            <div className={styles.welcomeBlock}>
              <h1 className={styles.welcomeTitle}>Welcome back</h1>
              <p className={styles.welcomeSubtitle}>Stay rooted in Scripture today</p>
            </div>
            <div
              className={styles.translationSwitcher}
              style={{
                alignSelf: "center",
                padding: "8px 14px",
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,0.1)",
                background: "#e0f2fe",
                fontSize: 13,
                fontWeight: 600,
                color: "#0891b2",
              }}
            >
              NIV
            </div>
          </div>

          <Card className={styles.verseCard}>
            <CardHeader className={styles.verseHeader}>
              <div className={styles.verseHeaderInner}>
                <Calendar className={styles.verseIcon} aria-hidden="true" />
                <CardTitle className={styles.verseTitle}>Verse of the day</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={styles.verseContent}>
              <blockquote className={styles.verseQuote}>
                “Do not conform to the pattern of this world, but be transformed by the renewing of your mind.”
              </blockquote>
              <cite className={styles.verseReference}>— Romans 12:2</cite>
            </CardContent>
          </Card>

          <div className={styles.quickSection}>
            <h2 className={styles.sectionTitle}>Continue your journey</h2>
            <div className={styles.quickGrid}>
              {quickActions.map((action) => (
                <Card key={action.label} className={styles.quickCard}>
                  <CardContent className={styles.quickCardContent}>
                    <action.icon className={styles.quickIcon} aria-hidden="true" />
                    <div className={styles.quickCopy}>
                      <CardTitle className={styles.quickCardTitle}>{action.label}</CardTitle>
                      <CardDescription className={styles.quickCardDescription}>
                        {action.subtitle}
                      </CardDescription>
                      <p className={styles.quickFootnote}>{action.detail}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className={styles.statsCard}>
            <CardHeader className={styles.statsHeader}>
              <CardTitle className={styles.statsTitle}>
                <Clock className={styles.statsIcon} aria-hidden="true" />
                Rhythm overview
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.statsContent}>
              {progressData.map((item) => (
                <div key={item.label} className={styles.progressRow}>
                  <div className={styles.progressMeta}>
                    <span className={styles.progressLabel}>{item.label}</span>
                    <span className={styles.progressValue}>{item.value}%</span>
                  </div>
                  <Progress value={item.value} className={styles.progressBar} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={styles.notesCard}>
            <CardHeader className={styles.notesHeader}>
              <CardTitle className={styles.notesTitle}>Recent reflections</CardTitle>
            </CardHeader>
            <CardContent className={styles.notesContent}>
              {recentNotes.map((note) => (
                <div key={note.id} className={styles.noteItem}>
                  <p className={styles.noteMeta}>
                    {note.reference} • {note.updatedLabel}
                  </p>
                  <p className={styles.noteExcerpt}>{note.excerpt}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </StitchCaptureShell>
  );
}

const sampleVerses = [
  { verse: 12, text: "Not that I have already obtained all this, or have already arrived at my goal, but I press on to take hold of that for which Christ Jesus took hold of me." },
  { verse: 13, text: "Brothers and sisters, I do not consider myself yet to have taken hold of it. But one thing I do: Forgetting what is behind and straining toward what is ahead," },
  { verse: 14, text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus." },
];

export function StitchCaptureScripture() {
  return (
    <StitchCaptureShell currentScreen="reader">
      <div className={readerStyles.readerPage}>
        <div className={readerStyles.toolbar}>
          <div className={readerStyles.toolbarRow}>
            <div className={readerStyles.selectorGroup}>
              <div
                className={clsx(readerStyles.selectorItem, readerStyles.selectorItemTranslation)}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(15,23,42,0.1)", background: "#e0f2fe", fontSize: 14 }}
              >
                New International Version
              </div>
              <div
                className={clsx(readerStyles.selectorItem, readerStyles.selectorItemBook)}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(15,23,42,0.1)", background: "#e0f2fe", fontSize: 14 }}
              >
                Philippians
              </div>
              <div
                className={clsx(readerStyles.selectorItem, readerStyles.selectorItemChapter)}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(15,23,42,0.1)", background: "#e0f2fe", fontSize: 14, textAlign: "center" }}
              >
                3
              </div>
            </div>
            <div className={readerStyles.navControls}>
              <button type="button" className={readerStyles.navControlButton}>
                <ChevronLeft className={clsx(readerStyles.navIcon, readerStyles.navIconLeft)} />
                Previous
              </button>
              <button type="button" className={readerStyles.navControlButton}>
                Next
                <ChevronRight className={clsx(readerStyles.navIcon, readerStyles.navIconRight)} />
              </button>
            </div>
          </div>
          <div className={readerStyles.translationMeta}>New International Version • Philippians 3</div>
        </div>

        <div className={readerStyles.readerContent}>
          <div className={readerStyles.verseList}>
            {sampleVerses.map((verse, index) => (
              <div
                key={verse.verse}
                className={clsx(readerStyles.verseCard, readerStyles.verseCardHoverable, {
                  [readerStyles.verseCardHighlighted]: index === 0,
                })}
              >
                <div className={readerStyles.verseContent}>
                  <span className={clsx("scripture-text", readerStyles.verseNumber)}>{verse.verse}</span>
                  <p className={clsx("scripture-text", readerStyles.verseText)}>{verse.text}</p>
                </div>
                <div
                  className={clsx(readerStyles.verseActions, {
                    [readerStyles.verseActionsVisible]: index === 0,
                  })}
                >
                  <Heart className={readerStyles.verseActionIcon} style={{ color: index === 0 ? "#0ea5e9" : undefined }} />
                  <MessageSquare className={readerStyles.verseActionIcon} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StitchCaptureShell>
  );
}

export function StitchCaptureLogin() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ width: "min(100%, 390px)", margin: "0 auto" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 16px",
            background: "linear-gradient(180deg, #e0f2ff 0%, #f5f9ff 45%, #ffffff 100%)",
          }}
        >
          <div
            style={{
              width: "100%",
              borderRadius: 28,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid rgba(148,163,184,0.22)",
              boxShadow: "0 28px 60px rgba(15,23,42,0.16)",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 28,
              alignItems: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  background: "linear-gradient(140deg, rgba(14,165,233,0.16), rgba(59,130,246,0.4))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image src="/sword_logo.png" alt="SWORD" width={48} height={48} />
              </div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "0.1em" }}>SWORD</h1>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Scripture • Wisdom • Order • Reflection • Devotion
              </p>
            </div>
            <div style={{ width: "100%", padding: 24, borderRadius: 22, border: "1px solid rgba(148,163,184,0.22)", background: "#fff" }}>
              <p style={{ margin: "0 0 16px", fontSize: 26, fontWeight: 700, textAlign: "center" }}>Sign In</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Email</label>
                <input readOnly value="you@example.com" style={{ height: 46, borderRadius: 12, border: "1px solid #cbd5e1", padding: "0 16px", background: "#f8fafc" }} />
                <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
                <input readOnly value="••••••••" style={{ height: 46, borderRadius: 12, border: "1px solid #cbd5e1", padding: "0 16px", background: "#f8fafc" }} />
                <button style={{ marginTop: 8, height: 48, borderRadius: 14, border: "none", background: "linear-gradient(135deg, #0f172a, #1e293b)", color: "#fff", fontWeight: 600 }}>
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
