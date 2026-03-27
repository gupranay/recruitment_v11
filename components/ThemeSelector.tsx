"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ThemeOption = "light" | "dark" | "system";

const options: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: MonitorCog },
];

function setThemeTransitionClass() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("theme-switching");
  window.setTimeout(() => root.classList.remove("theme-switching"), 420);
}

export default function ThemeSelector({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = useMemo<ThemeOption>(() => {
    if (!mounted) return "system";
    if (theme === "light" || theme === "dark" || theme === "system") {
      return theme;
    }
    return "system";
  }, [mounted, theme]);

  const effectiveTheme: "light" | "dark" | null = mounted
    ? resolvedTheme === "dark"
      ? "dark"
      : "light"
    : null;

  const activeOption = options.find((option) => option.value === activeTheme);
  const ActiveIcon = activeOption?.icon ?? MonitorCog;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Toggle theme menu"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-3 shadow-[0_8px_25px_rgba(10,12,14,0.12)] backdrop-blur-md transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 dark:border-white/15 dark:bg-black/45",
            className,
          )}
        >
          <motion.span
            key={activeTheme}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-white/85"
          >
            <ActiveIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{activeOption?.label ?? "System"}</span>
          </motion.span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-neutral-700/80 transition-transform dark:text-white/70",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-52 rounded-2xl border border-black/10 bg-white/75 p-1.5 shadow-[0_16px_40px_rgba(10,12,14,0.14)] backdrop-blur-md dark:border-white/15 dark:bg-black/65"
      >
        <div className="grid gap-1" role="radiogroup" aria-label="Theme selector">
          {options.map((option) => {
            const isActive = activeTheme === option.value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={option.label}
                onClick={() => {
                  setThemeTransitionClass();
                  setTheme(option.value);
                  setOpen(false);
                }}
                className="relative z-10 inline-flex h-9 items-center justify-between rounded-xl px-3 text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 dark:text-white/80 dark:hover:text-white"
              >
                {isActive ? (
                  <motion.span
                    layoutId="theme-selector-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-emerald-500/16 dark:bg-emerald-400/20"
                  />
                ) : null}
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </span>
                {isActive ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTheme + (effectiveTheme ?? "pending")}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-1 rounded-lg border border-black/10 bg-white/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-700 dark:border-white/15 dark:bg-black/45 dark:text-white/70"
          >
            {activeTheme === "system"
              ? effectiveTheme
                ? `Auto: ${effectiveTheme}`
                : "Auto"
              : activeTheme}
          </motion.div>
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
