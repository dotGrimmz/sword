import { fetchHostProfiles } from "@/lib/api/pre-reads";

import pageStyles from "../AdminPage.module.css";
import HostsManager from "./HostsManager";

export const dynamic = "force-dynamic";

export default async function AdminHostsPage() {
  const hosts = await fetchHostProfiles();
  const activeCount = hosts.filter((host) => host.is_host_active).length;

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <p className={pageStyles.eyebrow}>Admin · Hosts</p>
        <h2 className={pageStyles.title}>Stream Hosts</h2>
        <p className={pageStyles.description}>
          Configure public-facing host details. Active hosts appear in Weekly
          Study scheduling.
        </p>
      </header>

      <section className={pageStyles.statsRow} aria-label="Host counts">
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>Hosts</p>
          <p className={pageStyles.statValue}>{hosts.length}</p>
          <p className={pageStyles.statMeta}>Total profiles</p>
        </div>
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>Active</p>
          <p className={pageStyles.statValue}>{activeCount}</p>
          <p className={pageStyles.statMeta}>Available for scheduling</p>
        </div>
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>Inactive</p>
          <p className={pageStyles.statValue}>{hosts.length - activeCount}</p>
          <p className={pageStyles.statMeta}>Hidden from dropdowns</p>
        </div>
      </section>

      <div className={pageStyles.sectionSpacer}>
        <HostsManager initialHosts={hosts} />
      </div>
    </main>
  );
}
