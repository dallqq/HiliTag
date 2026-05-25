"use client";

import { useEffect, useState } from "react";

export function ModelStrip() {
  const [modelName, setModelName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchHealth() {
      const BASE = (process.env.NEXT_PUBLIC_FLASK_API_URL as string) || "http://localhost:5000";

      // Try proxy first, then direct backend URL as fallback
      const endpoints = ["/health", `${BASE}/health`];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) continue;
          const data = await res.json();
          if (mounted && data && data.model) {
            setModelName(String(data.model));
            return;
          }
        } catch (e) {
          // try next endpoint
        }
      }

      if (mounted) setModelName("unknown");
    }

    fetchHealth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <footer
      className="flex items-center gap-2.5 border-t border-[rgba(139,69,19,0.15)] bg-paper-warm px-8 py-2 text-[11.5px] text-ink-muted"
      aria-label="Model information"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M15 2v2M9 2v2M2 9h2M2 15h2M22 9h-2M22 15h-2M15 22v-2M9 22v-2" />
      </svg>
      <span className="rounded-full border border-[rgba(139,69,19,0.15)] bg-paper-mid px-2.5 py-0.5 text-[11px] font-medium text-ink">
        {modelName ?? "loading..."}
      </span>
      <span>·</span>
      <span>Fine-tuned for Hiligaynon · 6 OntoNotes categories</span>
      <span className="ml-auto flex items-center gap-1.5">
      </span>
    </footer>
  );
}
