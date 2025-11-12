import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fetchHostProfiles } from "@/lib/api/pre-reads";

import pageStyles from "../../AdminPage.module.css";
import PreReadForm from "../PreReadForm";

export const dynamic = "force-dynamic";

export default async function AdminCreatePreReadPage() {
  const hosts = await fetchHostProfiles({ activeOnly: true });

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
        <h1 className={pageStyles.title}>Create Pre-Read</h1>
        <p className={pageStyles.description}>
          Define the passage, add reflection questions, and schedule when the
          study should appear to members.
        </p>
      </header>

      <div className={pageStyles.sectionSpacer}>
        <PreReadForm mode="create" hostOptions={hosts} />
      </div>
    </main>
  );
}
