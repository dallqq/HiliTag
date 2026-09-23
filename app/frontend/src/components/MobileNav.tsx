"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSavedDocuments, SAVED_DOCS_UPDATED_EVENT } from "@/lib/storage";

export type NavTab = "analyze" | "saved" | "graph";

interface MobileNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenInfo: () => void;
}

export function MobileNav({ activeTab, onTabChange, onOpenInfo }: MobileNavProps) {
  const [savedCount, setSavedCount] = useState<number>(0);

  useEffect(() => {
    const updateCount = () => {
      setSavedCount(getSavedDocuments().length);
    };
    updateCount();

    window.addEventListener(SAVED_DOCS_UPDATED_EVENT, updateCount);
    return () => window.removeEventListener(SAVED_DOCS_UPDATED_EVENT, updateCount);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[rgba(139,69,19,0.2)] bg-paper/95 px-2 pb-safe pt-2 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      {/* Analyze Tab */}
      <button
        type="button"
        onClick={() => onTabChange("analyze")}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-all active:scale-95",
          activeTab === "analyze"
            ? "text-accent font-semibold"
            : "text-ink-muted hover:text-ink"
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            activeTab === "analyze" ? "bg-accent/15 text-accent" : "text-ink-muted"
          )}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </div>
        <span>Analyze</span>
      </button>

      {/* Saved Docs Tab */}
      <button
        type="button"
        onClick={() => onTabChange("saved")}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-all active:scale-95",
          activeTab === "saved"
            ? "text-accent font-semibold"
            : "text-ink-muted hover:text-ink"
        )}
      >
        <div
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            activeTab === "saved" ? "bg-accent/15 text-accent" : "text-ink-muted"
          )}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          {savedCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-xs">
              {savedCount}
            </span>
          )}
        </div>
        <span>Saved</span>
      </button>

      {/* Knowledge Graph Tab */}
      <button
        type="button"
        onClick={() => onTabChange("graph")}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-all active:scale-95",
          activeTab === "graph"
            ? "text-accent font-semibold"
            : "text-ink-muted hover:text-ink"
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            activeTab === "graph" ? "bg-accent/15 text-accent" : "text-ink-muted"
          )}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <circle cx="18" cy="6" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8.5l7 7M15.5 6h-7M18 8.5v7" />
          </svg>
        </div>
        <span>Graph</span>
      </button>

      {/* Info / Legend Tab */}
      <button
        type="button"
        onClick={onOpenInfo}
        className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium text-ink-muted transition-all hover:text-ink active:scale-95"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <span>Info</span>
      </button>
    </nav>
  );
}
