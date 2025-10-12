"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { Counter } from "@/types/apologetics";
import styles from "./CounterAccordion.module.css";

interface CounterAccordionProps {
  items: Counter[] | null | undefined;
}

export function CounterAccordion({ items }: CounterAccordionProps) {
  if (!items || items.length === 0) {
    return (
      <p className={styles.empty}>
        No counterarguments have been recorded for this topic yet.
      </p>
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
                {item.objection ?? "Objection"}
              </p>
              <Badge variant="outline" className={styles.badge}>
                Objection
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className={styles.content}>
            {item.rebuttal ? (
              <div className={styles.contentBlock}>
                <p className={styles.contentHeading}>Rebuttal</p>
                <p className={styles.contentText}>{item.rebuttal}</p>
              </div>
            ) : null}
            {item.objection ? (
              <div className={styles.contentBlock}>
                <p className={styles.contentHeading}>Objection</p>
                <p className={styles.contentText}>{item.objection}</p>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
