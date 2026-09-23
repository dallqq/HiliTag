"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { SAMPLE_TEXTS } from "@/lib/entityConfig";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  isLoading: boolean;
}

export function TextInput({
  value,
  onChange,
  onAnalyze,
  onClear,
  isLoading,
}: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onAnalyze();
    }
  };

  return (
    <section
      className="border-b border-[rgba(139,69,19,0.15)] bg-paper px-4 py-4 md:px-8 md:py-6"
      aria-label="Text input"
    >
      <h1 className="font-lora text-[17px] md:text-[18px] font-medium text-ink">
        Analyze Hiligaynon text
      </h1>
      <p className="mb-3 mt-0.5 text-[12.5px] md:text-[13px] leading-relaxed text-ink-muted">
        Paste or type any Hiligaynon sentence or passage. The model will
        identify and classify named entities using XLM-RoBERTa.
      </p>

      {/* Sample text quick pills - horizontal scroll on mobile */}
      <div className="mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 md:mx-0 md:px-0">
        <span className="flex-shrink-0 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-faint">
          Samples:
        </span>
        {SAMPLE_TEXTS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onChange(sample.text)}
            className="flex-shrink-0 rounded-full border border-[rgba(139,69,19,0.2)] bg-paper-warm px-3 py-1 text-[11.5px] font-medium text-ink-muted transition-all hover:border-accent hover:bg-accent-light hover:text-accent active:scale-95"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        placeholder="Isulat ang Hiligaynon nga teksto diri… (e.g., Si Jose Rizal nagsulat sang Noli Me Tangere sa Pilipinas.)"
        className={cn(
          "w-full resize-y rounded-xl border border-[rgba(139,69,19,0.25)] bg-paper-warm px-3.5 py-3 md:px-4 md:py-3.5",
          // 16px on mobile prevents iOS Safari automatic viewport zoom on focus
          "font-lora text-[16px] md:text-[14.5px] italic leading-[1.65] md:leading-[1.75] text-ink placeholder:text-ink-faint",
          "outline-none transition-all focus:border-accent-mid focus:bg-white",
          "disabled:opacity-50"
        )}
        disabled={isLoading}
        aria-label="Hiligaynon text input"
      />

      <div className="mt-3 flex items-center gap-2 md:gap-2.5">
        {/* Primary action */}
        <button
          onClick={onAnalyze}
          disabled={isLoading || !value.trim()}
          className={cn(
            "flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 md:py-[9px] min-h-[44px]",
            "font-sans text-[13.5px] md:text-[13px] font-medium tracking-[0.02em] text-white shadow-sm",
            "transition-all hover:bg-accent-dark active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {isLoading ? (
            <>
              <Spinner />
              Analyzing…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <span>Analyze text</span>
            </>
          )}
        </button>

        <button
          onClick={onClear}
          disabled={isLoading || !value}
          className="rounded-xl border border-[rgba(139,69,19,0.25)] px-4 py-2.5 md:py-[9px] min-h-[44px] text-[13px] text-ink-muted transition-all hover:bg-paper-warm hover:text-ink active:scale-[0.98] disabled:opacity-40"
        >
          Clear
        </button>

        {/* Keyboard hint (desktop only) */}
        <span className="hidden sm:inline-flex items-center text-[11.5px] text-ink-faint ml-1">
          or <kbd className="ml-1 rounded bg-paper-mid px-1 py-0.5 font-mono text-[10px]">⌘ Enter</kbd>
        </span>
      </div>
    </section>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
