"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { Evidence } from "@/types/apologetics";

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
      <p className="text-sm text-slate-400">
        No supporting evidence has been added yet.
      </p>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="rounded-lg border border-slate-800 bg-slate-900/60 px-4"
        >
          <AccordionTrigger className="text-left text-base font-semibold text-slate-100">
            <div className="flex flex-col gap-1 text-left">
              <span className="text-sm font-medium">
                {item.summary ?? "Evidence summary"}
              </span>
              <Badge variant="outline" className="w-fit text-[0.7rem]">
                {labelForKind(item.kind)}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-slate-300">
            {item.summary ?? "No summary provided yet."}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
