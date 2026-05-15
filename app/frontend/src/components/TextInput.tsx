"use client";

import { useRef } from "react";
import { SAMPLE_TEXTS } from "@/lib/entityConfig";
import { cn } from "@/lib/utils";

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

  const loadSample = (text: string) => {
    onChange(text);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onAnalyze();
    }
  };

  return (
    <section
      className="border-b border-[rgba(139,69,19,0.15)] bg-paper px-8 py-6"
      aria-label="Text input"
    >
      <h1 className="font-lora text-[18px] font-medium text-ink">
        Analyze Hiligaynon text
      </h1>
      <p className="mb-3.5 mt-1 text-[13px] leading-relaxed text-ink-muted">
        Paste or type any Hiligaynon sentence or passage. The model will
        identify and classify named entities using XLM-RoBERTa.
      </p>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={4}
        placeholder="Isulat ang Hiligaynon nga teksto diri… (e.g., Si Jose Rizal nagsulat sang Noli Me Tangere sa Pilipinas.)"
        className={cn(
          "w-full resize-y rounded-xl border border-[rgba(139,69,19,0.25)] bg-paper-warm px-4 py-3.5",
          "font-lora text-[14.5px] italic leading-[1.75] text-ink placeholder:text-ink-faint",
          "outline-none transition-all focus:border-accent-mid focus:bg-white",
          "disabled:opacity-50"
        )}
        disabled={isLoading}
        aria-label="Hiligaynon text input"
      />

      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        {/* Primary action */}
        <button
          onClick={onAnalyze}
          disabled={isLoading || !value.trim()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg bg-accent px-5 py-[9px]",
            "font-sans text-[13px] font-medium tracking-[0.02em] text-white",
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              Analyze text
            </>
          )}
        </button>

        <button
          onClick={onClear}
          disabled={isLoading}
          className="rounded-lg border border-[rgba(139,69,19,0.25)] px-4 py-[9px] text-[13px] text-ink-muted transition-all hover:bg-paper-warm hover:text-ink disabled:opacity-40"
        >
          Clear
        </button>

        {/* Keyboard hint */}
        <span className="text-[11.5px] text-ink-faint">
          or <kbd className="rounded bg-paper-mid px-1 py-0.5 font-mono text-[10px]">⌘ Enter</kbd>
        </span>

        {/* Samples */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11.5px] text-ink-faint">Try sample:</span>
          {SAMPLE_TEXTS.map((s) => (
            <button
              key={s.label}
              onClick={() => loadSample(s.text)}
              disabled={isLoading}
              className="rounded-lg border border-[rgba(139,69,19,0.15)] bg-accent-light px-[11px] py-[5px] text-[11.5px] font-medium text-accent transition-all hover:bg-[#efd8c6] disabled:opacity-40"
            >
              {s.label}
            </button>
          ))}
        </div>
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
