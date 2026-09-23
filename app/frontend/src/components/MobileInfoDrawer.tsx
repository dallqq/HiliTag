"use client";

import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { EntityType, NEREntity, SessionStats } from "@/types/ner";

interface MobileInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entities?: NEREntity[];
  sessionStats?: SessionStats;
}

export function MobileInfoDrawer({
  isOpen,
  onClose,
  entities = [],
  sessionStats,
}: MobileInfoDrawerProps) {
  if (!isOpen) return null;

  const countFor = (type: EntityType) =>
    entities.filter((e) => e.entity_type === type).length;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs md:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Information & Entity Legend"
    >
      <div
        className="animate-sheet-up flex max-h-[85vh] flex-col rounded-t-2xl border-t border-[rgba(139,69,19,0.25)] bg-paper p-5 pb-safe shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper-mid" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] pb-3">
          <div>
            <h2 className="font-lora text-[17px] font-semibold text-ink">
              System Info & Legend
            </h2>
            <p className="text-[11px] text-ink-muted">
              Hiligaynon Named Entity Recognition · hil
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-warm text-ink-muted hover:text-ink"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-5 overflow-y-auto py-4">
          {/* Entity Legend */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              Recognized Entity Categories
            </p>
            <div className="grid grid-cols-1 gap-2">
              {(
                Object.entries(ENTITY_CONFIG) as [
                  EntityType,
                  typeof ENTITY_CONFIG[EntityType]
                ][]
              )
                .filter(([type]) => type !== "NORP")
                .map(([type, cfg]) => {
                  const count = countFor(type);
                  return (
                    <div
                      key={type}
                      className="flex items-start gap-3 rounded-xl border border-[rgba(139,69,19,0.12)] bg-paper-warm/70 p-2.5 transition-colors"
                    >
                      <span
                        className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ background: cfg.border }}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-ink">
                            {cfg.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="rounded px-1.5 py-0.2 text-[9.5px] font-bold uppercase"
                              style={{
                                background: cfg.bg,
                                color: cfg.text,
                                outline: `1px solid ${cfg.border}`,
                              }}
                            >
                              {type}
                            </span>
                            {count > 0 && (
                              <span className="rounded-full bg-accent px-1.5 py-0.2 text-[10px] font-semibold text-white">
                                {count}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
                          {cfg.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Session Stats (if provided) */}
          {sessionStats && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                Current Session Stats
              </p>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-xl border border-[rgba(139,69,19,0.12)] bg-paper-warm/60 p-2.5">
                  <span className="text-[11px] text-ink-muted">Sentences Analyzed</span>
                  <p className="font-lora text-lg font-semibold text-ink">
                    {sessionStats.sentences}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgba(139,69,19,0.12)] bg-paper-warm/60 p-2.5">
                  <span className="text-[11px] text-ink-muted">Total Entities Found</span>
                  <p className="font-lora text-lg font-semibold text-ink">
                    {sessionStats.totalEntities}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* About / Model specifications */}
          <div className="rounded-xl border border-[rgba(139,69,19,0.12)] bg-white p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Architecture & Modeling
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
              Fine-tuned XLM-RoBERTa model built specifically for the low-resource Hiligaynon (Ilonggo) language. Uses affix-preserving tokenization and BIOES tagging boundaries.
            </p>
          </div>

          {/* Links & downloads */}
          <div className="space-y-2 pt-1">
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/HiliTag_docs.md`}
              download
              className="flex items-center justify-between rounded-xl border border-[rgba(139,69,19,0.2)] bg-paper-warm p-3 text-[12.5px] font-medium text-ink transition hover:bg-paper-mid"
            >
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Documentation (Markdown)</span>
              </div>
              <span className="text-ink-faint">↓</span>
            </a>

            <a
              href={process.env.NEXT_PUBLIC_GITHUB_REPO || "https://github.com/dallqq/HiliTag"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-[rgba(139,69,19,0.2)] bg-paper-warm p-3 text-[12.5px] font-medium text-ink transition hover:bg-paper-mid"
            >
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.66-.22.66-.49 0-.24-.01-.87-.01-1.71-2.78.61-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1.01.07 1.54 1.03 1.54 1.03.9 1.54 2.36 1.1 2.94.84.09-.65.35-1.1.63-1.35-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.26-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85.004 1.71.115 2.51.338 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.66.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.16.59.67.49A10 10 0 0022 12c0-5.52-4.48-10-10-10z" />
                </svg>
                <span>GitHub Repository</span>
              </div>
              <span className="text-ink-faint">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
