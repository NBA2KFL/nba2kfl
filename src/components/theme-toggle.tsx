"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon }
] as const;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      aria-label="Préférence de thème"
      className="flex items-center gap-0.5 rounded-[14px] border border-command-border bg-command-surface-muted/70 p-1"
      role="radiogroup"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = mounted && resolvedTheme === value;

        return (
          <button
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              "grid h-8 w-8 cursor-pointer place-items-center rounded-[10px] text-command-muted-strong transition duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgba(94,106,210,0.22)]",
              isActive
                ? "bg-command-surface text-command-accent shadow-[0_7px_18px_rgba(16,24,40,0.08),inset_0_0_0_1px_rgba(204,210,223,0.72)]"
                : "hover:bg-command-surface hover:text-command-ink hover:shadow-[0_1px_0_rgba(16,24,40,0.04)]"
            )}
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            type="button"
          >
            <Icon aria-hidden size={15} strokeWidth={2.25} />
          </button>
        );
      })}
    </div>
  );
}
