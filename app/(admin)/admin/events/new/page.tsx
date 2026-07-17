import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { PreRead } from "@/types/pre-read";

import pageStyles from "../../AdminPage.module.css";
import EventForm from "../EventForm";

export const dynamic = "force-dynamic";

export default async function AdminNewEventPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pre_reads")
    .select("id, title, book, chapter, week_start")
    .order("week_start", { ascending: false })
    .limit(40);

  const studies = (data ?? []) as Pick<
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
        <h2 className={pageStyles.title}>New event</h2>
        <p className={pageStyles.description}>
          Create a one-time or recurring gathering.
        </p>
      </header>
      <EventForm mode="create" studies={studies} />
    </main>
  );
}
