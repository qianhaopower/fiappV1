"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface HelpTooltipProps {
  content: string;
}

const TOOLTIP_WIDTH = 256; // matches w-64
const VIEWPORT_MARGIN = 12;

export function HelpTooltip({ content }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({ left: 0 });
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
      const vw = window.innerWidth;
      const usable = vw - 2 * VIEWPORT_MARGIN;
      const width = Math.min(TOOLTIP_WIDTH, usable);

      if (rect.left + width <= vw - VIEWPORT_MARGIN) {
        setPosition({ left: 0 });
      } else if (rect.right - width >= VIEWPORT_MARGIN) {
        setPosition({ right: 0 });
      } else {
        setPosition({ left: VIEWPORT_MARGIN - rect.left });
      }
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
          style={position}
          className="absolute top-6 z-50 w-64 max-w-[calc(100vw-24px)] rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-lg"
        >
          {content}
        </div>
      )}
    </div>
  );
}
