import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";

import styles from "./QrLoginPage.module.css";

const DEFAULT_LOGIN_URL =
  process.env.NEXT_PUBLIC_PROD_URL ??
  `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`;

const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  scale: 10,
  margin: 1,
  color: {
    dark: "#0F172AFF",
    light: "#FFFFFFFF",
  },
};

export const dynamic = "force-dynamic";

export default async function AdminQrLoginPage() {
  const dataUrl = await QRCode.toDataURL(DEFAULT_LOGIN_URL, QR_OPTIONS);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin" className={styles.backLink}>
          ← Back to Admin
        </Link>
        <div>
          <h1 className={styles.title}>Share the Login QR</h1>
          <p className={styles.subtitle}>
            Display this code on signage or screens so members can jump straight
            to the production login flow without typing the URL.
          </p>
        </div>
      </div>

      <section className={styles.qrCard}>
        <div className={styles.qrDisplay}>
          <img
            src={dataUrl}
            alt="QR code linking to the production login page"
            className={styles.qrImage}
            loading="lazy"
          />
        </div>
        <div className={styles.logoBadge}>
          <Image
            src="/sword_logo.png"
            alt="SWORD logo"
            width={40}
            height={40}
            className={styles.logoImage}
            priority
          />
        </div>
        <p className={styles.qrDescription}>
          Scan the code above or visit{" "}
          <strong>{DEFAULT_LOGIN_URL.replace(/^https?:\/\//, "")}</strong>
        </p>
        <div className={styles.actions}>
          <Button asChild variant="outline">
            <Link href="/admin">Return to Admin Console</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
