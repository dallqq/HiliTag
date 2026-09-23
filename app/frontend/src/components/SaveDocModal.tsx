"use client";

import { useState, useEffect } from "react";

interface SaveDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  textSnippet: string;
  entityCount: number;
}

export function SaveDocModal({
  isOpen,
  onClose,
  onSave,
  textSnippet,
  entityCount,
}: SaveDocModalProps) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setTitle(`Hiligaynon Doc — ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Save Document"
    >
      <div
        className="animate-sheet-up w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-[rgba(139,69,19,0.2)] bg-paper p-5 sm:p-6 pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </div>
            <h3 className="font-lora text-[17px] font-semibold text-ink">
              Save Document
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-warm text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-muted mb-1.5">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title..."
              autoFocus
              className="w-full rounded-xl border border-[rgba(139,69,19,0.25)] bg-paper-warm px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-accent focus:bg-white"
            />
          </div>

          <div className="rounded-xl border border-[rgba(139,69,19,0.12)] bg-white p-3 text-[12px] text-ink-muted">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-ink">Included Content</span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                {entityCount} entit{entityCount === 1 ? "y" : "ies"}
              </span>
            </div>
            <p className="line-clamp-2 italic text-ink-muted font-lora">
              &ldquo;{textSnippet}&rdquo;
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[rgba(139,69,19,0.2)] px-4 py-2.5 text-[13px] font-medium text-ink-muted transition hover:bg-paper-warm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-xl bg-accent px-5 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-accent-dark disabled:opacity-50"
            >
              Save Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
