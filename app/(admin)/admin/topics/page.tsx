import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { fetchTopics } from "@/lib/api/apologetics";
import TopicsManager from "./TopicsManager";

import pageStyles from "../AdminPage.module.css";

export const dynamic = "force-dynamic";

export default async function AdminTopicsPage() {
  const topics = await fetchTopics();

  if (!topics) {
    notFound();
  }

  const initialTopics = topics.map((topic) => ({
    id: topic.id,
    title: topic.title ?? "",
    objection: topic.objection ?? "",
    claim: topic.claim ?? "",
    summary: topic.summary ?? "",
    difficulty: topic.difficulty ?? "intro",
    est_minutes: topic.est_minutes ?? null,
    tags:
      Array.isArray(topic.tags) && topic.tags.length
        ? topic.tags
        : typeof topic.tags === "string"
          ? topic.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
    updated_at: topic.updated_at ?? null,
  }));

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <div className={pageStyles.backRow}>
          <Link href="/admin" className={pageStyles.backLink}>
            <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
            Back to Admin Overview
          </Link>
        </div>
        <p className={pageStyles.eyebrow}>Admin · Topics</p>
        <h1 className={pageStyles.title}>Manage Apologetics Topics</h1>
        <p className={pageStyles.description}>
          Create, update, and publish apologetics topics. Each topic should
          include an objection, a gospel-centered claim, and summary details that
          power the Apologetics module.
        </p>
      </header>

      <div className={pageStyles.sectionSpacer}>
        <TopicsManager initialTopics={initialTopics} />
      </div>
    </main>
  );
}
