"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
    <div className="theme-toggle" role="radiogroup" aria-label="Préférence de thème">
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          aria-label={label}
          aria-pressed={mounted && resolvedTheme === value}
          className={`theme-toggle-option${mounted && resolvedTheme === value ? " is-active" : ""}`}
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          type="button"
        >
          <Icon aria-hidden size={15} strokeWidth={2.25} />
        </button>
      ))}
    </div>
  );
}
