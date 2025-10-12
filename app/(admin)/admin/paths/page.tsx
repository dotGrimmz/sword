import { notFound } from "next/navigation";

import { fetchPaths } from "@/lib/api/apologetics";
import PathsManager from "./PathsManager";

import pageStyles from "../AdminPage.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPathsPage() {
  const paths = await fetchPaths();

  if (!paths) {
    notFound();
  }

  const initialPaths = paths.map((path) => ({
    id: path.id,
    title: path.title ?? "",
    subtitle: path.subtitle ?? "",
    description: path.description ?? "",
    difficulty: path.difficulty ?? "intro",
    est_minutes:
      typeof path.est_minutes === "number" ? path.est_minutes : null,
    tags:
      Array.isArray(path.tags)
        ? path.tags.filter(Boolean)
        : typeof path.tags === "string"
          ? path.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
    updated_at: path.updated_at ?? null,
  }));

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <p className={pageStyles.eyebrow}>Admin · Paths</p>
        <h1 className={pageStyles.title}>Manage Learning Paths</h1>
        <p className={pageStyles.description}>
          Paths combine multiple topics into guided learning journeys. Update the
          metadata here to influence how they appear throughout the app.
        </p>
      </header>

      <div className={pageStyles.sectionSpacer}>
        <PathsManager initialPaths={initialPaths} />
      </div>
    </main>
  );
}
