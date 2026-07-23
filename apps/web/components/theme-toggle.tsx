"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: Monitor, label: "System" },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {THEMES.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(value)}
          aria-label={`${label} mode`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
}
