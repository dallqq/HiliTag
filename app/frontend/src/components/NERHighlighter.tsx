"use client";

import { useMemo } from "react";
import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { NEREntity } from "@/types/ner";

interface NERHighlighterProps {
  text: string;
  entities: NEREntity[];
}

interface Segment {
  text: string;
  entity?: NEREntity;
}

function buildSegments(text: string, entities: NEREntity[]): Segment[] {
  if (!entities.length) return [{ text }];

  // Find character offsets for each entity (first occurrence)
  type Span = { start: number; end: number; entity: NEREntity };
  const spans: Span[] = [];

  let cursor = 0;
  const sorted = [...entities].sort((a, b) => {
    const ai = text.indexOf(a.text, 0);
    const bi = text.indexOf(b.text, 0);
    return ai - bi;
  });

  for (const ent of sorted) {
    const idx = text.indexOf(ent.text, cursor);
    if (idx === -1) continue;
    // Avoid overlaps
    if (spans.some((s) => s.start <= idx && idx < s.end)) continue;
    spans.push({ start: idx, end: idx + ent.text.length, entity: ent });
    cursor = Math.max(cursor, idx + ent.text.length);
  }

  spans.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let pos = 0;
  for (const span of spans) {
    if (span.start > pos) {
      segments.push({ text: text.slice(pos, span.start) });
    }
    segments.push({ text: span.entity.text, entity: span.entity });
    pos = span.end;
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos) });
  }
  return segments;
}

export function NERHighlighter({ text, entities }: NERHighlighterProps) {
  const segments = useMemo(() => buildSegments(text, entities), [text, entities]);

  return (
    <div
      className="rounded-xl border border-[rgba(139,69,19,0.15)] bg-white px-6 py-5 font-lora text-[15.5px] leading-[2] text-ink"
      aria-label="Annotated text with highlighted entities"
    >
      {segments.map((seg, i) => {
        if (!seg.entity) {
          return <span key={i}>{seg.text}</span>;
        }
        const cfg = ENTITY_CONFIG[seg.entity.entity_type];
        const pct = Math.round(seg.entity.confidence * 100);
        return (
          <span
            key={i}
            className="entity-highlight"
            style={{
              background: cfg.bg,
              outline: `1.5px solid ${cfg.border}`,
            }}
            title={`${cfg.label} · ${pct}% confidence`}
            aria-label={`${seg.text} — ${cfg.label}, ${pct}% confidence`}
          >
            {seg.text}
            <span
              className="entity-label-sup"
              style={{ color: cfg.border }}
              aria-hidden="true"
            >
              {seg.entity.entity_type}
            </span>
          </span>
        );
      })}
    </div>
  );
}
