import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowUpRight } from "lucide-react";

import styles from "../AdminPage.module.css";

const DEFAULT_LOGIN_URL =
  process.env.NEXT_PUBLIC_PROD_URL ??
  `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`;

const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  scale: 10,
  margin: 1,
  color: {
    dark: "#1A1A1AFF",
    light: "#FFFFFFFF",
  },
};

export const dynamic = "force-dynamic";

export default async function AdminQrLoginPage() {
  const dataUrl = await QRCode.toDataURL(DEFAULT_LOGIN_URL, QR_OPTIONS);
  const displayUrl = DEFAULT_LOGIN_URL.replace(/^https?:\/\//, "");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Admin · Login QR</p>
        <h2 className={styles.title}>Share the Login QR</h2>
        <p className={styles.description}>
          Display this code on signage so members can open the production login
          without typing the URL.
        </p>
      </header>

      <section className={styles.primaryCta}>
        <div className={styles.primaryCtaCopy}>
          <p className={styles.primaryCtaEyebrow}>Login destination</p>
          <h3 className={styles.primaryCtaTitle}>Production login</h3>
          <p className={styles.primaryCtaMeta}>
            QR points to{" "}
            <span className={styles.qrUrl}>{displayUrl}</span>
          </p>
        </div>
        <Link href="/login" className={styles.primaryCtaButton}>
          Open login
          <ArrowUpRight className={styles.primaryCtaIcon} aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.qrCard}>
        <div className={styles.qrDisplay}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="QR code linking to the production login page"
            className={styles.qrImage}
            loading="lazy"
          />
        </div>
        <div className={styles.qrLogo}>
          <Image
            src="/sword_logo.png"
            alt="SWORD logo"
            width={36}
            height={36}
            className={styles.qrLogoImage}
            priority
          />
        </div>
        <p className={styles.qrDescription}>
          Scan the code above or visit{" "}
          <strong className={styles.qrUrl}>{displayUrl}</strong>
        </p>
      </section>
    </main>
  );
}
