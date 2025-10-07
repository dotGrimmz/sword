import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./page.module.css";

const sections = [
  {
    title: "Information We Collect",
    body: "We store the minimum required to make your account work: your email address, saved notes, highlights, and memory verses. We never collect payment information or sell personal data.",
  },
  {
    title: "How We Use Your Data",
    body: "Content you save is used solely to power the study experience inside SWORD. We may aggregate anonymous usage statistics to improve features, but we do not share identifiable data with third parties.",
  },
  {
    title: "Your Controls",
    body: "You can export or delete your data at any time by contacting support@sword.app. Deleting your account removes your saved content from our systems within 30 days.",
  },
  {
    title: "Security",
    body: "We rely on Supabase authentication and encrypted storage for user content. Only authorised services have access to production data, and all access is logged.",
  },
  {
    title: "Contact",
    body: "Questions about privacy? Email support@sword.app and we will respond within two business days.",
  },
];

export const metadata = {
  title: "Privacy Policy • SWORD",
  description: "Learn how SWORD handles and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/settings" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to settings
        </Link>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>
          Transparency matters to us. Here is how we handle your information
          when you use SWORD.
        </p>
        <span className={styles.lastUpdated}>
          Last updated: {new Date().getFullYear()}
        </span>
      </header>

      <div className={styles.sectionList}>
        {sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <p className={styles.sectionBody}>{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
