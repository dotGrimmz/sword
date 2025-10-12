import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { fetchSources } from "@/lib/api/apologetics";
import SourcesManager from "./SourcesManager";

import pageStyles from "../AdminPage.module.css";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const sources = await fetchSources();

  if (!sources) {
    notFound();
  }

  const initialSources = sources.map((source) => ({
    id: source.id,
    type: source.type ?? "",
    author: source.author ?? "",
    work: source.work ?? "",
    year_or_era: source.year_or_era ?? "",
    location: source.location ?? "",
    url: source.url ?? "",
    notes: source.notes ?? "",
    updated_at: source.updated_at ?? null,
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
        <p className={pageStyles.eyebrow}>Admin · Sources</p>
        <h1 className={pageStyles.title}>Manage Sources &amp; References</h1>
        <p className={pageStyles.description}>
          Add or update supporting references used across apologetics topics and
          paths. Well-documented sources help learners dig deeper.
        </p>
      </header>

      <div className={pageStyles.sectionSpacer}>
        <SourcesManager initialSources={initialSources} />
      </div>
    </main>
  );
}
