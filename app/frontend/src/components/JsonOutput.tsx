"use client";

import { useState } from "react";
import type { PredictResponse } from "@/types/ner";

interface JsonOutputProps {
  response: PredictResponse;
}

export function JsonOutput({ response }: JsonOutputProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(response, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: select all
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(139,69,19,0.15)] bg-paper-warm">
      <div className="flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-paper-mid px-2.5 py-0.5 font-mono text-[11px] text-ink-muted">
            POST
          </span>
          <span className="font-mono text-[12px] text-ink-muted">
            /api/predict
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-[rgba(139,69,19,0.2)] px-3 py-1.5 text-[11px] text-ink-muted transition-all hover:bg-paper-mid hover:text-ink"
        >
          {copied ? "✓ Copied" : "Copy JSON"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-[1.65] text-ink">
        <code>{json}</code>
      </pre>
    </div>
  );
}
