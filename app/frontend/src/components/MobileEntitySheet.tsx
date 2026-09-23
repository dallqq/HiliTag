"use client";

import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { EntityType, NEREntity } from "@/types/ner";

interface MobileEntitySheetProps {
  entity: NEREntity | null;
  fullText: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEntity: (updated: NEREntity) => void;
  onDeleteEntity: () => void;
}

const CATEGORIES: EntityType[] = [
  "PERSON",
  "ORG",
  "LOCATION",
  "EVENT",
  "DATETIME",
  "MONEY",
];

export function MobileEntitySheet({
  entity,
  fullText,
  isOpen,
  onClose,
  onUpdateEntity,
  onDeleteEntity,
}: MobileEntitySheetProps) {
  if (!isOpen || !entity) return null;

  const cfg = ENTITY_CONFIG[entity.entity_type] || {
    label: entity.entity_type,
    description: "",
    bg: "#f3efe8",
    border: "#8B4513",
    text: "#1a1714",
  };
  const pct = Math.round((entity.confidence || 0.95) * 100);

  const start = entity.start ?? fullText.indexOf(entity.text);
  const end = entity.end ?? (start + entity.text.length);

  const handleAdjustStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(start + delta, end - 1));
    if (newStart === start) return;
    const newText = fullText.slice(newStart, end);
    onUpdateEntity({
      ...entity,
      start: newStart,
      end,
      text: newText,
    });
  };

  const handleAdjustEnd = (delta: number) => {
    const newEnd = Math.max(start + 1, Math.min(end + delta, fullText.length));
    if (newEnd === end) return;
    const newText = fullText.slice(start, newEnd);
    onUpdateEntity({
      ...entity,
      start,
      end: newEnd,
      text: newText,
    });
  };

  const handleSelectType = (newType: EntityType) => {
    onUpdateEntity({
      ...entity,
      entity_type: newType,
      label: ENTITY_CONFIG[newType]?.label || newType,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-xs md:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit Entity Details"
    >
      <div
        className="animate-sheet-up flex max-h-[85vh] flex-col rounded-t-2xl border-t border-[rgba(139,69,19,0.25)] bg-paper p-5 pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper-mid" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] pb-3">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: cfg.border }}
              aria-hidden="true"
            />
            <h2 className="font-lora text-[17px] font-semibold text-ink">
              Entity Inspector
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-warm text-ink-muted hover:text-ink active:scale-95"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body content */}
        <div className="space-y-4 overflow-y-auto py-3.5">
          {/* Current Entity Text Card */}
          <div className="rounded-xl border border-[rgba(139,69,19,0.18)] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span
                className="rounded px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                style={{
                  background: cfg.bg,
                  color: cfg.text,
                  outline: `1px solid ${cfg.border}`,
                }}
              >
                {entity.entity_type}
              </span>
              <span className="text-[12px] font-medium text-ink-muted">
                {pct}% confidence
              </span>
            </div>
            <p className="mt-2 font-lora text-[18px] italic leading-snug text-ink">
              &ldquo;{entity.text}&rdquo;
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-paper-mid">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: cfg.border,
                }}
              />
            </div>
          </div>

          {/* Bound Adjusters (Nudge span) */}
          <div className="rounded-xl border border-[rgba(139,69,19,0.12)] bg-paper-warm/80 p-3.5">
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Adjust Text Boundaries
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Start Bound Controls */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-ink-muted">Start of span:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAdjustStart(-1)}
                    disabled={start <= 0}
                    className="flex-1 rounded-lg border border-[rgba(139,69,19,0.2)] bg-paper py-2 text-[12px] font-semibold text-ink shadow-2xs transition hover:bg-paper-mid active:scale-95 disabled:opacity-40"
                  >
                    ◀ Expand
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStart(1)}
                    disabled={start >= end - 1}
                    className="flex-1 rounded-lg border border-[rgba(139,69,19,0.2)] bg-paper py-2 text-[12px] font-semibold text-ink shadow-2xs transition hover:bg-paper-mid active:scale-95 disabled:opacity-40"
                  >
                    Shrink ▶
                  </button>
                </div>
              </div>

              {/* End Bound Controls */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-ink-muted">End of span:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAdjustEnd(-1)}
                    disabled={end <= start + 1}
                    className="flex-1 rounded-lg border border-[rgba(139,69,19,0.2)] bg-paper py-2 text-[12px] font-semibold text-ink shadow-2xs transition hover:bg-paper-mid active:scale-95 disabled:opacity-40"
                  >
                    ◀ Shrink
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustEnd(1)}
                    disabled={end >= fullText.length}
                    className="flex-1 rounded-lg border border-[rgba(139,69,19,0.2)] bg-paper py-2 text-[12px] font-semibold text-ink shadow-2xs transition hover:bg-paper-mid active:scale-95 disabled:opacity-40"
                  >
                    Expand ▶
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Change Category Switcher */}
          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Change Entity Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const itemCfg = ENTITY_CONFIG[cat];
                const isSelected = entity.entity_type === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectType(cat)}
                    className="rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-all active:scale-95"
                    style={{
                      borderColor: isSelected ? itemCfg.border : "rgba(139,69,19,0.2)",
                      backgroundColor: isSelected ? itemCfg.bg : "#faf8f5",
                      color: isSelected ? itemCfg.text : "#6b6560",
                      outline: isSelected ? `1.5px solid ${itemCfg.border}` : "none",
                    }}
                  >
                    {itemCfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onDeleteEntity();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-4 py-2.5 text-[12.5px] font-medium text-red-700 transition hover:bg-red-100 active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Entity</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-accent py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-accent-dark active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
