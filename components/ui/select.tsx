"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from "lucide-react";
import { cn } from "@/components/ui/utils"; // adjust path to your helper

/* -------------------------------------------------------------------------- */
/*                                    Root                                   */
/* -------------------------------------------------------------------------- */

function Select({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<React.ReactNode>("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<Map<string, React.ReactNode>>(new Map());

  const handleValueChange = (newValue: string) => {
    onValueChange?.(newValue);
    setOpen(false);
  };

  useEffect(() => {
    if (value && optionsRef.current.has(value)) {
      setLabel(optionsRef.current.get(value));
    } else if (!value) {
      setLabel("");
    }
  }, [value, children]);

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      value: value ?? "",
      label,
      setLabel,
      onValueChange: handleValueChange,
      triggerRef,
      optionsRef,
    }),
    [open, value, label]
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Context API                                */
/* -------------------------------------------------------------------------- */

interface SelectContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: string;
  label: React.ReactNode;
  setLabel: React.Dispatch<React.SetStateAction<React.ReactNode>>;
  triggerRef: React.RefObject<HTMLButtonElement>;
  onValueChange: (value: string) => void;
  optionsRef: React.RefObject<Map<string, React.ReactNode>>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectCtx() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used inside <Select>");
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*                                   Trigger                                  */
/* -------------------------------------------------------------------------- */

function SelectTrigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { open, setOpen, triggerRef } = useSelectCtx();
  return (
    <button
      ref={triggerRef}
      type="button"
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      onClick={() => setOpen(!open)}
    >
      {children}
      {open ? (
        <ChevronUpIcon className="h-4 w-4 opacity-60" />
      ) : (
        <ChevronDownIcon className="h-4 w-4 opacity-60" />
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */

function SelectContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen, triggerRef } = useSelectCtx();
  const ref = useRef<HTMLDivElement>(null);

  // close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !ref.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setOpen, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md",
        className
      )}
    >
      <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
        {children}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Item                                     */
/* -------------------------------------------------------------------------- */

function SelectItem({
  children,
  value,
  className,
}: {
  children: React.ReactNode;
  value: string;
  className?: string;
}) {
  const {
    value: selectedValue,
    onValueChange,
    setLabel,
    optionsRef,
  } = useSelectCtx();
  const isSelected = selectedValue === value;

  useEffect(() => {
    if (optionsRef.current) {
      optionsRef.current.set(value, children);
    }
  }, [value, children, optionsRef]);

  return (
    <li
      role="option"
      aria-selected={isSelected}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground font-medium",
        className
      )}
      onClick={() => {
        onValueChange(value);
        setLabel(children);
      }}
    >
      <span className="flex-1">{children}</span>
      {isSelected && <CheckIcon className="h-4 w-4" />}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Value                                    */
/* -------------------------------------------------------------------------- */

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, label } = useSelectCtx();

  return <span className="truncate">{value ? label : placeholder}</span>;
}

/* -------------------------------------------------------------------------- */
/*                                Group / Label                               */
/* -------------------------------------------------------------------------- */

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function SelectLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1.5 text-xs text-muted-foreground">{children}</div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Exports                                   */
/* -------------------------------------------------------------------------- */

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
};
