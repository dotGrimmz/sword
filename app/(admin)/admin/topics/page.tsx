import { notFound } from "next/navigation";

import { fetchTopics } from "@/lib/api/apologetics";
import TopicsManager from "./TopicsManager";

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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 md:px-8 lg:px-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Admin · Topics
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">
          Manage Apologetics Topics
        </h1>
        <p className="max-w-2xl text-base text-slate-300">
          Create, update, and publish apologetics topics. Each topic should
          include an objection, a gospel-centered claim, and summary details that
          power the Apologetics module.
        </p>
      </header>

      <TopicsManager initialTopics={initialTopics} />
    </main>
  );
}
