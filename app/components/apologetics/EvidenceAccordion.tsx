"use client";

import Image from "next/image";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { Evidence } from "@/types/apologetics";
import styles from "./EvidenceAccordion.module.css";

interface EvidenceAccordionProps {
  items: Evidence[] | null | undefined;
}

const labelForKind = (kind?: string | null) => {
  if (!kind) return "Evidence";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
};

export function EvidenceAccordion({ items }: EvidenceAccordionProps) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Image
          src="/sword_logo.png"
          alt="SWORD logo"
          width={36}
          height={36}
          className={styles.emptyIcon}
        />
        <p className={styles.empty}>
          No supporting evidence has been added yet.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className={styles.container}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className={styles.item}
        >
          <AccordionTrigger className={styles.trigger}>
            <div className={styles.summary}>
              <p className={styles.summaryText}>
                {item.summary ?? "Evidence summary"}
              </p>
              <Badge variant="outline" className={styles.badge}>
                {labelForKind(item.kind)}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className={styles.content}>
            {item.summary ?? "No summary provided yet."}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
