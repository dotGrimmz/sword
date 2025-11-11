import Link from "next/link";
import { ArrowLeft, CalendarPlus, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPreReads } from "@/lib/api/pre-reads";
import type { PreRead } from "@/types/pre-read";

import pageStyles from "../AdminPage.module.css";
import listStyles from "./PreReadList.module.css";

export const dynamic = "force-dynamic";

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getStatus = (preRead: PreRead) => {
  if (preRead.is_cancelled) {
    return { label: "Cancelled", variant: "destructive" as const };
  }
  if (!preRead.published) {
    return { label: "Draft", variant: "secondary" as const };
  }

  const now = Date.now();
  const startsAt = new Date(preRead.visible_from).getTime();
  const endsAt = new Date(preRead.visible_until).getTime();

  if (now < startsAt) {
    return { label: "Scheduled", variant: "outline" as const };
  }
  if (now > endsAt) {
    return { label: "Expired", variant: "secondary" as const };
  }
  return { label: "Live", variant: "default" as const };
};

const formatWindow = (preRead: PreRead) => {
  const start = formatDateTime(preRead.visible_from);
  const end = formatDateTime(preRead.visible_until);
  return `${start} → ${end}`;
};

export default async function AdminPreReadListPage() {
  const preReads = await fetchPreReads();

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <div className={pageStyles.backRow}>
          <Link href="/admin" className={pageStyles.backLink}>
            <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
            Back to Admin Overview
          </Link>
        </div>
        <p className={pageStyles.eyebrow}>Admin · Pre-Reads</p>
        <h1 className={pageStyles.title}>Daily Pre-Read Sessions</h1>
        <p className={pageStyles.description}>
          Plan and publish the daily Pre-Read experience. Assign hosts, control
          visibility windows, and keep members informed ahead of each study.
        </p>
        <div className={pageStyles.sectionSpacer}>
          <Button asChild>
            <Link href="/admin/pre-read/new">
              <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Pre-Read
            </Link>
          </Button>
        </div>
      </header>

      <section className={`${pageStyles.panel} ${listStyles.panel}`}>
        {preReads.length === 0 ? (
          <div className={listStyles.emptyState}>
            <FileText className="h-10 w-10" aria-hidden="true" />
            <p>No Pre-Reads yet. Create your first daily study above.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Passage</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Visibility Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {preReads.map((preRead) => {
                const status = getStatus(preRead);
                return (
                  <TableRow key={preRead.id}>
                    <TableCell className="align-top">
                      <div className={listStyles.passageTitle}>
                        {preRead.book} {preRead.chapter}
                      </div>
                      {preRead.verses_range && (
                        <div className={listStyles.passageMeta}>
                          Verses {preRead.verses_range}
                        </div>
                      )}
                      <p className={listStyles.passageSummary}>
                        {preRead.summary}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      {preRead.host_profile?.username ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {formatWindow(preRead)}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/pre-read/${preRead.id}/edit`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
