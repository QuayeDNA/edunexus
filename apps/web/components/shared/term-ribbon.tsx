"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

/**
 * The Term Ribbon — EduNexus's one signature, cross-portal chrome element.
 * See docs/design/01-DESIGN-PHILOSOPHY.md §6 and 02-DESIGN-SYSTEM.md §3.
 *
 * Deliberately reads --sidebar-primary (already scoped per role via [data-role]
 * in globals.css) rather than taking a color prop — this way it automatically
 * shows the right accent in whichever portal it's rendered in, with zero
 * per-usage configuration. Pure/presentational: fetch the data in a Server
 * Component and pass it in (see current-term-ribbon.tsx for the wired version).
 */

export interface TermRibbonTerm {
  id: string;
  name: string;
  termNumber: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  locked: boolean;
}

export interface TermRibbonProps {
  academicYear: {
    name: string;
    startDate: Date;
    endDate: Date;
  };
  terms: TermRibbonTerm[];
  className?: string;
}

function clampProgress(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function TermRibbon({ academicYear, terms, className }: TermRibbonProps) {
  const [open, setOpen] = useState(false);

  const yearSpanMs =
    academicYear.endDate.getTime() - academicYear.startDate.getTime();

  const bands = useMemo(
    () =>
      terms.map((term) => {
        const span = term.endDate.getTime() - term.startDate.getTime();
        const widthPct = yearSpanMs > 0 ? (span / yearSpanMs) * 100 : 100 / terms.length;
        return { ...term, widthPct };
      }),
    [terms, yearSpanMs],
  );

  const todayProgress = useMemo(() => {
    const now = Date.now();
    const elapsed = now - academicYear.startDate.getTime();
    return yearSpanMs > 0 ? clampProgress(elapsed / yearSpanMs) : 0;
  }, [academicYear.startDate, yearSpanMs]);

  const currentTerm = terms.find((t) => t.isCurrent) ?? terms[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "group/ribbon flex w-full items-center gap-3 border-b border-border bg-sidebar px-4 py-2 text-left",
          className,
        )}
        aria-label="View academic calendar"
      >
        {/* Color-block bands, one per term — the "woven ledger" motif (Philosophy §5).
            Staggered entrance on mount, respects prefers-reduced-motion via the
            motion-safe: variant so it's a no-op otherwise. */}
        <div className="relative flex h-2 flex-1 overflow-hidden rounded-full bg-sidebar-accent">
          {bands.map((band, i) => (
            <div
              key={band.id}
              className={cn(
                "h-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2",
                band.isCurrent ? "bg-sidebar-primary" : "bg-sidebar-primary/35",
              )}
              style={{
                width: `${band.widthPct}%`,
                animationDelay: `${i * 40}ms`,
                animationDuration: "300ms",
              }}
            />
          ))}
          {/* "today" marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/60"
            style={{ left: `${todayProgress * 100}%` }}
            aria-hidden
          />
        </div>

        <span className="whitespace-nowrap text-sm font-medium text-sidebar-foreground">
          {academicYear.name}
          {currentTerm ? ` · ${currentTerm.name}` : ""}
        </span>
        {currentTerm?.locked && (
          <Badge variant="outline" className="whitespace-nowrap">
            Locked
          </Badge>
        )}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-sidebar-foreground/60 transition-transform group-data-[popup-open]/ribbon:rotate-180"
          aria-hidden
        />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80">
        <p className="mb-1 font-display text-base font-medium text-popover-foreground">
          {academicYear.name}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          {format(academicYear.startDate, "d MMM yyyy")} –{" "}
          {format(academicYear.endDate, "d MMM yyyy")}
        </p>
        <ul className="space-y-2">
          {terms.map((term) => (
            <li
              key={term.id}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                term.isCurrent && "bg-accent",
              )}
            >
              <span className="font-medium">{term.name}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {format(term.startDate, "d MMM")} – {format(term.endDate, "d MMM")}
                {term.locked && (
                  <Badge variant="outline" className="text-[0.65rem]">
                    Locked
                  </Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
