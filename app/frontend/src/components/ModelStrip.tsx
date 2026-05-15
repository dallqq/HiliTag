export function ModelStrip() {
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
        xlm-roberta-base
      </span>
      <span>·</span>
      <span>Fine-tuned for Hiligaynon · 18 OntoNotes categories</span>
      <span className="ml-auto flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
        API ready
      </span>
    </footer>
  );
}
