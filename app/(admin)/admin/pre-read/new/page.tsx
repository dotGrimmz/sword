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
            Weekly Studies
          </Link>
        </div>
        <p className={pageStyles.eyebrow}>Weekly Study</p>
        <h2 className={pageStyles.title}>Create this week&apos;s study</h2>
        <p className={pageStyles.description}>
          Add topic, scripture, materials, and a short summary. Use the preview
          to check the member view before you publish.
        </p>
      </header>

      <PreReadForm mode="create" hostOptions={hosts} />
    </main>
  );
}
