"use client";

import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { NEREntity } from "@/types/ner";

interface EntityTableProps {
  entities: NEREntity[];
}

export function EntityTable({ entities }: EntityTableProps) {
  if (!entities.length) {
    return (
      <p className="p-4 text-[13px] text-ink-muted">No entities found.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(139,69,19,0.15)]">
      <table
        className="w-full border-collapse text-[13.5px]"
        aria-label="Extracted entities"
      >
        <thead>
          <tr>
            {["#", "Entity text", "Type", "Description", "Confidence"].map((h) => (
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
            const cfg = ENTITY_CONFIG[ent.entity_type];
            const pct = Math.round(ent.confidence * 100);
            return (
              <tr
                key={`${ent.text}-${i}`}
                className="border-b border-[rgba(139,69,19,0.1)] transition-colors last:border-0 hover:bg-paper-warm"
              >
                <td className="px-3 py-2.5 text-ink-faint">{i + 1}</td>
                <td className="px-3 py-2.5 font-lora italic">{ent.text}</td>
                <td className="px-3 py-2.5">
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
                </td>
                <td className="px-3 py-2.5 text-ink-muted">{cfg.label}</td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
