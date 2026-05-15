"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type NavTab = "analyze" | "saved" | "model" | "docs";

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: "analyze", label: "Analyze" },
  { id: "saved", label: "Saved Docs" },
  { id: "model", label: "Model Info" },
  { id: "docs", label: "Docs" },
];

interface HeaderProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
}

export function Header({ activeTab = "analyze", onTabChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-[58px] items-center justify-between border-b border-[rgba(139,69,19,0.25)] bg-paper px-8">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[6px] bg-accent font-lora text-[15px] font-semibold tracking-tight text-white">
          Hl
        </div>
        <div>
          <p className="font-lora text-[17px] font-semibold leading-tight tracking-tight text-ink">
            HiliTag
          </p>
          <p className="text-[10px] font-light uppercase tracking-[0.08em] text-ink-muted">
            Named Entity Recognition
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex gap-1" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange?.(item.id)}
            className={cn(
              "rounded-full px-[14px] py-[5px] text-[13px] transition-all",
              activeTab === item.id
                ? "bg-accent font-medium text-white"
                : "text-ink-muted hover:bg-paper-warm hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Badge */}
      <span className="rounded-full border border-[rgba(139,69,19,0.25)] bg-accent-light px-[10px] py-[3px] text-[11px] font-medium uppercase tracking-[0.06em] text-accent">
        Hiligaynon · hil
      </span>
    </header>
  );
}
