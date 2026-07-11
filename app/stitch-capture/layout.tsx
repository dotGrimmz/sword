import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/ThemeContext";

export const metadata = {
  title: "Stitch Capture · SWORD",
  robots: "noindex, nofollow",
};

export default function StitchCaptureLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider initialTheme="realign">
      <div style={{ minHeight: "100vh", background: "#e8f4fc" }}>{children}</div>
    </ThemeProvider>
  );
}
