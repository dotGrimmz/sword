import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fetchPreRead } from "@/lib/api/pre-reads";

import pageStyles from "../../../AdminPage.module.css";
import PreReadForm from "../../PreReadForm";

export const dynamic = "force-dynamic";

export default async function AdminEditPreReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preRead = await fetchPreRead(id);

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <div className={pageStyles.backRow}>
          <Link href="/admin/pre-read" className={pageStyles.backLink}>
            <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
            Studies
          </Link>
        </div>
        <p className={pageStyles.eyebrow}>Study</p>
        <h2 className={pageStyles.title}>Edit study</h2>
        <p className={pageStyles.description}>
          Update the topic, scripture, materials, or publish status for this
          week.
        </p>
      </header>

      <PreReadForm mode="edit" initialData={preRead} />
    </main>
  );
}
