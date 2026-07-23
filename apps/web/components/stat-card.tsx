import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; direction: "up" | "down" | "neutral" };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {/* was: text-2xl font-bold (generic sans numeral) — Fraunces ties even a
                small dashboard number back to the "ceremonial document" thesis
                (Philosophy §3, System §1). Never used below 20px elsewhere, but a
                dashboard stat is exactly the kind of small, frequent dose that
                makes the system feel considered rather than a one-off flourish. */}
            <p className="font-display text-2xl font-medium tabular-nums" data-tabular>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1 text-xs">
            <span
              className={cn(
                "font-medium",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-destructive",
                trend.direction === "neutral" && "text-muted-foreground",
              )}
            >
              {trend.direction === "up" ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
