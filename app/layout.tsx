import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { OfflineProvider } from "@/components/OfflineProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SWORD Bible Study",
  description: "A focused environment for studying Scripture, notes, highlights, and memory verses.",
  icons: {
    icon: "/sword_logo.png",
    shortcut: "/sword_logo.png",
    apple: "/sword_logo.png",
  },
  manifest: "/manifest.json",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="ocean">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OfflineProvider>{children}</OfflineProvider>
      </body>
    </html>
  );
}
