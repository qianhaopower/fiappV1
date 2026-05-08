"use client";

import { useEffect, useRef, useState } from "react";

interface HelpTooltipProps {
  content: string;
}

const TOOLTIP_WIDTH = 256; // w-64
const VIEWPORT_MARGIN = 12;

export function HelpTooltip({ content }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleOpen() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setAlignRight(rect.left + TOOLTIP_WIDTH > window.innerWidth - VIEWPORT_MARGIN);
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={ref} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Help"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/70"
      >
        ?
      </button>
      {open && (
        <div
          className={`absolute top-6 z-50 w-64 rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-lg ${alignRight ? "right-0" : "left-0"}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
