import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getAdminSeries } from "@/lib/church-events/loaders";
import { createClient } from "@/lib/supabase/server";
import type { PreRead } from "@/types/pre-read";

import pageStyles from "../../../AdminPage.module.css";
import EventForm from "../../EventForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditEventPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const [series, studiesResult] = await Promise.all([
    getAdminSeries(supabase, id),
    supabase
      .from("pre_reads")
      .select("id, title, book, chapter, week_start")
      .order("week_start", { ascending: false })
      .limit(40),
  ]);

  if (!series) notFound();

  const studies = (studiesResult.data ?? []) as Pick<
    PreRead,
    "id" | "title" | "book" | "chapter" | "week_start"
  >[];

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.backRow}>
        <Link href="/admin/events" className={pageStyles.backLink}>
          <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
          Back to events
        </Link>
      </div>
      <header className={pageStyles.header}>
        <p className={pageStyles.eyebrow}>Admin · Events</p>
        <h2 className={pageStyles.title}>Edit event</h2>
        <p className={pageStyles.description}>{series.title}</p>
      </header>
      <EventForm mode="edit" initialSeries={series} studies={studies} />
    </main>
  );
}
