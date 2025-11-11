import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fetchHostProfiles } from "@/lib/api/pre-reads";

import pageStyles from "../AdminPage.module.css";
import HostsManager from "./HostsManager";

export const dynamic = "force-dynamic";

export default async function AdminHostsPage() {
  const hosts = await fetchHostProfiles();

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <div className={pageStyles.backRow}>
          <Link href="/admin" className={pageStyles.backLink}>
            <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
            Back to Admin Overview
          </Link>
        </div>
        <p className={pageStyles.eyebrow}>Admin · Hosts</p>
        <h1 className={pageStyles.title}>Stream Hosts</h1>
        <p className={pageStyles.description}>
          Configure the public-facing details for each host. Active hosts appear
          in scheduling dropdowns across the Pre-Read workflow.
        </p>
      </header>

      <div className={pageStyles.sectionSpacer}>
        <HostsManager initialHosts={hosts} />
      </div>
    </main>
  );
}
