"use client";

import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { NEREntity, EntityType } from "@/types/ner";

interface EntityTableProps {
  entities: NEREntity[];
  isEditable?: boolean;
  onChange?: (entities: NEREntity[]) => void;
  showConfidence?: boolean;
}

export function EntityTable({ entities, isEditable, onChange, showConfidence }: EntityTableProps) {
  if (!entities.length) {
    return (
      <p className="p-4 text-[13px] text-ink-muted">No entities found.</p>
    );
  }

  const handleTypeChange = (index: number, newType: EntityType) => {
    if (!onChange) return;
    const updated = [...entities];
    updated[index] = {
      ...updated[index],
      entity_type: newType,
      label: ENTITY_CONFIG[newType]?.label || newType,
    };
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    if (!onChange) return;
    const updated = entities.filter((_, i) => i !== index);
    onChange(updated);
  };

  const headers: string[] = ["#", "Entity text", "Type", "Description"];
  if (showConfidence ?? true) headers.push("Confidence");
  if (isEditable) headers.push("Action");

  return (
    <div>
      {/* Mobile Card Stack (visible on < md) */}
      <div className="flex flex-col gap-2.5 md:hidden" aria-label="Extracted entities list">
        {entities.map((ent, i) => {
          const cfg = ENTITY_CONFIG[ent.entity_type] || {
            label: ent.entity_type,
            bg: "#f3efe8",
            border: "#8B4513",
            text: "#1a1714",
          };
          const pct = Math.round(ent.confidence * 100);

          return (
            <div
              key={`${ent.text}-${i}`}
              className="rounded-xl border border-[rgba(139,69,19,0.14)] bg-white p-3.5 shadow-2xs transition-all"
            >
              {/* Top row: Index, Entity text, Type badge / select */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="mt-0.5 rounded bg-paper-warm px-1.5 py-0.5 text-[10.5px] font-mono font-medium text-ink-muted">
                    #{i + 1}
                  </span>
                  <p className="font-lora text-[15px] font-semibold italic text-ink truncate">
                    {ent.text}
                  </p>
                </div>

                {isEditable ? (
                  <select
                    value={ent.entity_type}
                    onChange={(e) => handleTypeChange(i, e.target.value as EntityType)}
                    className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer flex-shrink-0"
                    style={{
                      background: cfg.bg,
                      color: cfg.text,
                      outline: `1px solid ${cfg.border}`,
                    }}
                  >
                    {Object.keys(ENTITY_CONFIG)
                      .filter((type) => type !== "NORP")
                      .map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                  </select>
                ) : (
                  <span
                    className="rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider flex-shrink-0"
                    style={{
                      background: cfg.bg,
                      color: cfg.text,
                      outline: `1px solid ${cfg.border}`,
                    }}
                  >
                    {ent.entity_type}
                  </span>
                )}
              </div>

              {/* Middle row: Category description & confidence */}
              <div className="mt-2.5 flex items-center justify-between text-[12px] text-ink-muted">
                <span>{cfg.label}</span>
                {(showConfidence ?? true) && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-paper-mid">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: cfg.border,
                        }}
                      />
                    </div>
                    <span className="text-[11.5px] font-medium text-ink">{pct}%</span>
                  </div>
                )}
              </div>

              {/* Bottom row: Action (if editable) */}
              {isEditable && (
                <div className="mt-2.5 flex justify-end border-t border-[rgba(139,69,19,0.08)] pt-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(i)}
                    className="flex items-center gap-1 text-[12px] font-medium text-red-600 hover:text-red-800 transition-colors p-1"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table (visible on md+) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[rgba(139,69,19,0.15)]">
        <table
          className="w-full border-collapse text-[13.5px]"
          aria-label="Extracted entities"
        >
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-b border-[rgba(139,69,19,0.25)] bg-paper-warm px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-ink-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entities.map((ent, i) => {
              const cfg = ENTITY_CONFIG[ent.entity_type] || {
                label: ent.entity_type,
                bg: "#f3efe8",
                border: "#8B4513",
                text: "#1a1714",
              };
              const pct = Math.round(ent.confidence * 100);
              return (
                <tr
                  key={`${ent.text}-${i}`}
                  className="border-b border-[rgba(139,69,19,0.1)] transition-colors last:border-0 hover:bg-paper-warm"
                >
                  <td className="px-3 py-2.5 text-ink-faint">{i + 1}</td>
                  <td className="px-3 py-2.5 font-lora italic">{ent.text}</td>
                  <td className="px-3 py-2.5">
                    {isEditable ? (
                      <select
                        value={ent.entity_type}
                        onChange={(e) => handleTypeChange(i, e.target.value as EntityType)}
                        className="inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] outline-none cursor-pointer"
                        style={{
                          background: cfg.bg,
                          color: cfg.text,
                          outline: `1px solid ${cfg.border}`,
                        }}
                      >
                        {Object.keys(ENTITY_CONFIG)
                          .filter((type) => type !== "NORP")
                          .map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
                        style={{
                          background: cfg.bg,
                          color: cfg.text,
                          outline: `1px solid ${cfg.border}`,
                        }}
                      >
                        {ent.entity_type}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-ink-muted">{cfg.label}</td>
                  {(showConfidence ?? true) && (
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-mid">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: cfg.border,
                            }}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${pct}% confidence`}
                          />
                        </div>
                        <span className="w-8 text-[12px] text-ink-muted">
                          {pct}%
                        </span>
                      </div>
                    </td>
                  )}
                  {isEditable && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(i)}
                        className="text-ink-faint hover:text-red-600 transition-colors"
                        title="Delete entity"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
