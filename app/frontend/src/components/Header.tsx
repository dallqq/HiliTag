"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type NavTab = "analyze" | "saved" | "model";

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: "analyze", label: "Analyze" },
  { id: "saved", label: "Saved Docs" },
  { id: "model", label: "Model Info" },
  
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

      <div className="flex items-center gap-3">
        {/* GitHub link */}
        <a
          href={process.env.NEXT_PUBLIC_GITHUB_REPO || "https://github.com/your/repo"}
          target="_blank"
          rel="noreferrer"
          title="View repository on GitHub"
          className="p-2 hover:bg-paper-warm rounded text-ink-muted hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline-block">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.66-.22.66-.49 0-.24-.01-.87-.01-1.71-2.78.61-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1.01.07 1.54 1.03 1.54 1.03.9 1.54 2.36 1.1 2.94.84.09-.65.35-1.1.63-1.35-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.26-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85.004 1.71.115 2.51.338 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.66.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.16.59.67.49A10 10 0 0022 12c0-5.52-4.48-10-10-10z" />
          </svg>
        </a>

        {/* Docs download */}
        <a
          href="/HiliTag_docs.md"
          download
          title="Download project docs"
          className="p-2 hover:bg-paper-warm rounded text-ink-muted hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="inline-block">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>

        {/* Badge */}
        <span className="rounded-full border border-[rgba(139,69,19,0.25)] bg-accent-light px-[10px] py-[3px] text-[11px] font-medium uppercase tracking-[0.06em] text-accent">
          Hiligaynon · hil
        </span>
      </div>
    </header>
  );
}
