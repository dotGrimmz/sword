"use client";

import { ArrowUpRight, Calendar, Lightbulb, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

import { AppHeaderToolbar } from "./AppHeaderToolbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useHomeScreen } from "@/hooks/screens/useHomeScreen";
import styles from "./HomeScreen.module.css";

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const {
    role,
    showLoading,
    currentStudy,
    studyMeta,
    eventMeta,
    todaysVerse,
    isVerseLoading,
    recentNotes,
    quickActions,
    onNavigate: handleNavigate,
    onQuickAction,
    onNavigateSettings,
    onNavigateNotes,
  } = useHomeScreen({ onNavigate });

  return (
    <div className={styles.page}>
      {showLoading ? (
        <LoadingScreen subtitle="We're gathering your reflections and favorites." />
      ) : (
        <div className={styles.stack}>
          <div className={styles.headerStrip}>
            <div className={styles.welcomeBlock}>
              <h1 className={styles.welcomeTitle}>Welcome back</h1>
              <p className={styles.welcomeSubtitle}>
                Stay rooted in Scripture today
              </p>
            </div>

            <AppHeaderToolbar onNavigateProfile={onNavigateSettings} />
          </div>

          <p className={styles.welcomeTagline}>
            Scripture • Wisdom • Order • Reflection • Devotion
          </p>

          {role === "admin" ? (
            <Link href="/admin" className={styles.adminEntry}>
              <span className={styles.adminEntryIconWrap} aria-hidden="true">
                <Shield className={styles.adminEntryIcon} />
              </span>
              <span className={styles.adminEntryBody}>
                <span className={styles.adminEntryEyebrow}>Admin</span>
                <span className={styles.adminEntryTitle}>Admin console</span>
                <span className={styles.adminEntryMeta}>
                  Manage study, events, and login QR
                </span>
              </span>
              <ArrowUpRight className={styles.adminEntryCta} aria-hidden="true" />
            </Link>
          ) : null}

          {currentStudy && studyMeta ? (
            <Link href="/pre-read" className={styles.studyPanel}>
              <p className={styles.studyPanelEyebrow}>This Week&apos;s Study</p>
              <h2 className={styles.studyPanelTitle}>{studyMeta.title}</h2>
              <p className={styles.studyPanelMeta}>{studyMeta.reference}</p>
              <span className={styles.studyPanelCta}>
                Open study hub
                <ArrowUpRight className={styles.studyPanelCtaIcon} />
              </span>
            </Link>
          ) : null}

          {eventMeta ? (
            <Link href={eventMeta.href} className={styles.eventPanel}>
              <p className={styles.studyPanelEyebrow}>Upcoming event</p>
              <h2 className={styles.studyPanelTitle}>{eventMeta.title}</h2>
              <p className={styles.studyPanelMeta}>
                {eventMeta.when}
                {eventMeta.where ? ` · ${eventMeta.where}` : ""}
              </p>
              <span className={styles.studyPanelCta}>
                View event
                <ArrowUpRight className={styles.studyPanelCtaIcon} />
              </span>
            </Link>
          ) : null}

          {isVerseLoading || todaysVerse ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className={styles.verseCard}>
                <CardHeader className={styles.verseHeader}>
                  <div className={styles.verseHeaderInner}>
                    <Calendar className={styles.verseIcon} aria-hidden="true" />
                    <CardTitle className={styles.verseTitle}>
                      Verse of the day
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className={styles.verseContent}>
                  {isVerseLoading || !todaysVerse ? (
                    <div className={styles.verseLoader}>
                      <Loader2
                        className={styles.verseLoaderIcon}
                        aria-hidden="true"
                      />
                      <span>Preparing today&apos;s verse…</span>
                    </div>
                  ) : (
                    <>
                      <blockquote className={styles.verseQuote}>
                        “{todaysVerse.text}”
                      </blockquote>
                      <cite className={styles.verseReference}>
                        — {todaysVerse.reference}
                      </cite>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          <div className={styles.quickSection}>
            <h2 className={styles.sectionTitle}>Continue your journey</h2>
            <div className={styles.quickGrid}>
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className={styles.quickCard}
                    onClick={() => onQuickAction(action)}
                  >
                    <CardContent className={styles.quickCardContent}>
                      {action.renderIcon ? (
                        <div className={styles.quickIconWrapper}>
                          {action.renderIcon()}
                        </div>
                      ) : action.icon ? (
                        <action.icon
                          className={styles.quickIcon}
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className={styles.quickCopy}>
                        <CardTitle className={styles.quickCardTitle}>
                          {action.label}
                        </CardTitle>
                        <CardDescription
                          className={styles.quickCardDescription}
                        >
                          {action.subtitle}
                        </CardDescription>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className={styles.notesMotion}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <section
              className={styles.notesCard}
              aria-labelledby="recent-reflections-heading"
            >
              <div className={styles.notesHeader}>
                <div className={styles.notesTitleRow}>
                  <Lightbulb className={styles.notesIcon} aria-hidden="true" />
                  <h2
                    id="recent-reflections-heading"
                    className={styles.notesTitle}
                  >
                    Recent reflections
                  </h2>
                </div>
                <button
                  type="button"
                  className={styles.notesViewAll}
                  onClick={onNavigateNotes}
                >
                  View all
                  <ArrowUpRight
                    className={styles.notesViewAllIcon}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className={styles.notesContent}>
                {recentNotes.length > 0 ? (
                  <ul className={styles.notesList}>
                    {recentNotes.map((note, index) => (
                      <motion.li
                        key={note.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: 0.08 * index }}
                      >
                        <button
                          type="button"
                          className={styles.noteItem}
                          onClick={onNavigateNotes}
                        >
                          <div className={styles.noteItemTop}>
                            <span className={styles.noteReference}>
                              {note.reference ?? "Open reflection"}
                            </span>
                            {note.updatedLabel ? (
                              <span className={styles.noteWhen}>
                                {note.updatedLabel}
                              </span>
                            ) : null}
                          </div>
                          <p className={styles.noteExcerpt}>{note.excerpt}</p>
                          <span
                            className={styles.noteItemCta}
                            aria-hidden="true"
                          >
                            Open
                            <ArrowUpRight className={styles.noteItemCtaIcon} />
                          </span>
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.notePlaceholder}>
                    <div className={styles.notePlaceholderBadge}>
                      <Lightbulb
                        className={styles.notePlaceholderIcon}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className={styles.notePlaceholderTitle}>
                      Nothing captured yet
                    </h3>
                    <p className={styles.notePlaceholderCopy}>
                      Jot a takeaway, prayer, or question after you read —
                      your latest notes will show up here.
                    </p>
                    <button
                      type="button"
                      className={styles.notePlaceholderCta}
                      onClick={onNavigateNotes}
                    >
                      Write a reflection
                      <ArrowUpRight
                        className={styles.notePlaceholderCtaIcon}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                )}
              </div>
            </section>
          </motion.div>

          <p className={styles.ministryCredit}>Realign Ministries</p>
        </div>
      )}
    </div>
  );
}
