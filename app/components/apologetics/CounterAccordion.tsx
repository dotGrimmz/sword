"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { Counter } from "@/types/apologetics";

interface CounterAccordionProps {
  items: Counter[] | null | undefined;
}

export function CounterAccordion({ items }: CounterAccordionProps) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No counterarguments have been recorded for this topic yet.
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
                {item.objection ?? "Objection"}
              </span>
              <Badge variant="outline" className="w-fit text-[0.7rem]">
                Objection
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-slate-300">
            {item.rebuttal ? (
              <div>
                <p className="font-semibold text-slate-100">Rebuttal</p>
                <p>{item.rebuttal}</p>
              </div>
            ) : null}
            {item.objection ? (
              <div>
                <p className="font-semibold text-slate-100">Objection</p>
                <p>{item.objection}</p>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
