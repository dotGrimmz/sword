import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fetchHostProfiles, fetchPreRead } from "@/lib/api/pre-reads";

import pageStyles from "../../../AdminPage.module.css";
import PreReadForm from "../../PreReadForm";

export const dynamic = "force-dynamic";

export default async function AdminEditPreReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [preRead, hosts] = await Promise.all([
    fetchPreRead(id),
    fetchHostProfiles(),
  ]);

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <div className={pageStyles.backRow}>
          <Link href="/admin/pre-read" className={pageStyles.backLink}>
            <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
            Back to Pre-Reads
          </Link>
        </div>
        <p className={pageStyles.eyebrow}>Admin · Pre-Reads</p>
        <h1 className={pageStyles.title}>Edit Pre-Read</h1>
        <p className={pageStyles.description}>
          Update schedule details, adjust poll questions, or reassign hosts for
          this daily study entry.
        </p>
      </header>

      <div className={pageStyles.sectionSpacer}>
        <PreReadForm mode="edit" initialData={preRead} hostOptions={hosts} />
      </div>
    </main>
  );
}
