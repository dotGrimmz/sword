import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./page.module.css";

const sections = [
  {
    title: "Acceptance of Terms",
    body: "By creating an account or using SWORD you agree to these Terms of Service and to our Privacy Policy. If you do not agree, please do not use the product.",
  },
  {
    title: "Use of the Service",
    body: "SWORD is intended for personal study. You are responsible for the content you add and for ensuring your usage complies with local laws.",
  },
  {
    title: "Content Ownership",
    body: "All notes, highlights, and memory verses you save remain yours. You grant us permission to store and process them for the sole purpose of delivering the app experience.",
  },
  {
    title: "Availability",
    body: "We aim for high availability but do not guarantee uninterrupted access. Planned maintenance and unexpected outages may occur.",
    list: [
      "Backups are performed regularly, but we recommend exporting critical notes periodically.",
      "Beta features may change or be removed at any time.",
    ],
  },
  {
    title: "Contact",
    body: "Need help or want to report an issue? Email support@sword.app and we will respond promptly.",
  },
];

export const metadata = {
  title: "Terms of Service • SWORD",
  description: "Understand the terms that govern your use of SWORD.",
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/settings" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to settings
        </Link>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.subtitle}>
          These terms explain your rights and responsibilities when using SWORD.
          Please read them carefully.
        </p>
      </header>

      <div className={styles.sectionList}>
        {sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <p className={styles.sectionBody}>{section.body}</p>
            {section.list ? (
              <ul className={styles.list}>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
