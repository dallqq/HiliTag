"use client";

import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { EntityType, NEREntity } from "@/types/ner";

interface SidebarProps {
  entities: NEREntity[];
  sessionStats: { sentences: number; totalEntities: number };
}

export function Sidebar({ entities, sessionStats }: SidebarProps) {
  const countFor = (type: EntityType) =>
    entities.filter((e) => e.entity_type === type).length;

  return (
    <aside
      className="flex w-[220px] min-w-[220px] flex-col gap-6 border-r border-[rgba(139,69,19,0.15)] bg-paper px-4 py-6"
      aria-label="Entity legend and statistics"
    >
      {/* Entity legend */}
      <div>
        <p className="mb-2 text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-faint">
          Entity types
        </p>
        <ul className="flex flex-col gap-[3px]">
          {(
            Object.entries(ENTITY_CONFIG) as [EntityType, typeof ENTITY_CONFIG[EntityType]][]
          )
            .filter(([type]) => type !== "NORP")
            .map(([type, cfg]) => {
              const count = countFor(type);
              return (
                <li
                  key={type}
                  className="flex items-center gap-2 rounded-[6px] px-2 py-[5px] text-[12.5px] text-ink-muted transition-colors hover:bg-paper-warm"
                  style={{ opacity: count > 0 ? 1 : 0.45 }}
                >
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: cfg.border }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{cfg.label}</span>
                  {count > 0 && (
                    <span className="rounded-[4px] bg-paper-mid px-[5px] py-[1px] text-[11px] text-ink-faint">
                      {count}
                    </span>
                  )}
                </li>
              );
            }
          )}
        </ul>
      </div>

      {/* Session stats */}
      <div>
        <p className="mb-2 text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-faint">
          Session stats
        </p>
        <dl className="flex flex-col gap-0">
          {[
            { label: "Sentences", value: sessionStats.sentences },
            { label: "Total entities", value: sessionStats.totalEntities },
            { label: "Model", value: "XLM-R" },
            { label: "Scheme", value: "BIOES" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] py-[5px] text-[12px] last:border-0"
            >
              <dt className="text-ink-muted">{row.label}</dt>
              <dd className="text-[13px] font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* About */}
      <div className="mt-auto border-t border-[rgba(139,69,19,0.15)] pt-4">
        <p className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-faint">
          About
        </p>
        <p className="text-[11.5px] leading-relaxed text-ink-muted">
          Fine-tuned XLM-RoBERTa for Hiligaynon NER. Trained on OntoNotes 5.0
          categories using BIOES tagging.
        </p>
      </div>
    </aside>
  );
}
