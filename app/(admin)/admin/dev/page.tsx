import { redirect } from "next/navigation";

import AiUsageCard from "@/components/admin/AiUsageCard";
import { getCurrentUserRole } from "@/lib/admin/current-role";
import { isMasterRole } from "@/lib/admin/roles";

import styles from "../AdminPage.module.css";

export const dynamic = "force-dynamic";

export default async function AdminDevPage() {
  const role = await getCurrentUserRole();
  if (!isMasterRole(role)) {
    redirect("/admin");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Master · Dev</p>
        <h2 className={styles.title}>Dev tools</h2>
        <p className={styles.description}>
          Personal owner tools. Not shown to church admins. Start with OpenAI
          spend; more will land here later.
        </p>
      </header>

      <AiUsageCard />
    </main>
  );
}
