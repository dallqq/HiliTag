"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { NEREntity } from "@/types/ner";

interface NERHighlighterProps {
  text: string;
  entities: NEREntity[];
  onEntitiesChange?: (entities: NEREntity[]) => void;
}

interface Segment {
  text: string;
  entity?: NEREntity;
  resolvedIndex?: number;
}

interface ResolvedSpan {
  start: number;
  end: number;
  entity: NEREntity;
  originalIndex: number;
}

type DragSide = "start" | "end";

interface DragState {
  resolvedIndex: number;
  side: DragSide;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getOffsetFromPoint(container: HTMLElement, x: number, y: number): number | null {
  const element = container.ownerDocument.elementFromPoint(x, y);
  const charElement = element?.closest<HTMLElement>("[data-char-index]");

  if (!charElement) return null;

  const rawIndex = charElement.getAttribute("data-char-index");
  if (rawIndex === null) return null;

  const index = Number(rawIndex);
  return Number.isFinite(index) ? index : null;
}

function resolveSpans(text: string, entities: NEREntity[]): ResolvedSpan[] {
  if (!entities.length) return [];

  const ordered = entities
    .map((entity, originalIndex) => ({ entity, originalIndex }))
    .sort((a, b) => {
      const aStart = typeof a.entity.start === "number" ? a.entity.start : text.indexOf(a.entity.text);
      const bStart = typeof b.entity.start === "number" ? b.entity.start : text.indexOf(b.entity.text);
      if (aStart !== bStart) return aStart - bStart;
      return a.originalIndex - b.originalIndex;
    });

  const resolved: ResolvedSpan[] = [];
  let cursor = 0;

  for (const item of ordered) {
    const hasExplicitBounds =
      typeof item.entity.start === "number" &&
      typeof item.entity.end === "number" &&
      item.entity.start < item.entity.end;

    let start = 0;
    let end = 0;

    if (hasExplicitBounds) {
      start = clamp(Math.floor(item.entity.start ?? 0), 0, text.length);
      end = clamp(Math.floor(item.entity.end ?? start + 1), start + 1, text.length);
    } else {
      const fallbackIndex = text.indexOf(item.entity.text, cursor);
      const matchIndex = fallbackIndex !== -1 ? fallbackIndex : text.indexOf(item.entity.text);
      if (matchIndex === -1) continue;
      start = matchIndex;
      end = clamp(matchIndex + item.entity.text.length, start + 1, text.length);
      cursor = Math.max(cursor, end);
    }

    resolved.push({ start, end, entity: item.entity, originalIndex: item.originalIndex });
  }

  return resolved.sort((a, b) => a.start - b.start || a.originalIndex - b.originalIndex);
}

function buildSegments(text: string, spans: ResolvedSpan[]): Segment[] {
  if (!spans.length) return [{ text }];

  const segments: Segment[] = [];
  let pos = 0;
  for (let i = 0; i < spans.length; i += 1) {
    const span = spans[i];
    if (span.start > pos) {
      segments.push({ text: text.slice(pos, span.start) });
    }
    if (span.start < pos) continue;
    segments.push({ text: text.slice(span.start, span.end), entity: span.entity, resolvedIndex: i });
    pos = span.end;
  }
  if (pos < text.length) {
    segments.push({ text: text.slice(pos) });
  }
  return segments;
}

export function NERHighlighter({ text, entities, onEntitiesChange }: NERHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const resolvedSpans = useMemo(() => resolveSpans(text, entities), [text, entities]);
  const segments = useMemo(() => buildSegments(text, resolvedSpans), [text, resolvedSpans]);
  const mirrorChars = useMemo(
    () => Array.from(text).map((char, index) => ({ char, index })),
    [text]
  );

  useEffect(() => {
    if (!dragState || !onEntitiesChange) return;

    const handleMove = (event: PointerEvent) => {
      event.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const nextOffset = getOffsetFromPoint(container, event.clientX, event.clientY);
      if (nextOffset === null) return;

      const targetSpan = resolvedSpans[dragState.resolvedIndex];
      if (!targetSpan) return;

      const previousSpan = resolvedSpans[dragState.resolvedIndex - 1];
      const nextSpan = resolvedSpans[dragState.resolvedIndex + 1];
      const currentStart = targetSpan.start;
      const currentEnd = targetSpan.end;

      let start = currentStart;
      let end = currentEnd;

      if (dragState.side === "start") {
        const minStart = previousSpan ? previousSpan.end : 0;
        const maxStart = Math.max(currentEnd - 1, minStart);
        start = clamp(nextOffset, minStart, maxStart);
      } else {
        const minEnd = Math.min(currentStart + 1, text.length);
        const maxEnd = nextSpan ? nextSpan.start : text.length;
        end = clamp(nextOffset, minEnd, Math.max(minEnd, maxEnd));
      }

      if (start === currentStart && end === currentEnd) return;

      const updatedEntities = entities.map((entity, index) => {
        if (index !== targetSpan.originalIndex) return entity;
        return {
          ...entity,
          start,
          end,
          text: text.slice(start, end),
        };
      });

      onEntitiesChange(updatedEntities);
    };

    const handleEnd = () => setDragState(null);

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleEnd);
    document.addEventListener("pointercancel", handleEnd);

    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleEnd);
      document.removeEventListener("pointercancel", handleEnd);
    };
  }, [dragState, entities, onEntitiesChange, resolvedSpans, text]);

  const handleDragStart =
    (resolvedIndex: number, side: DragSide) =>
    (event: import("react").PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({ resolvedIndex, side });
    };

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-[rgba(139,69,19,0.15)] bg-white px-6 py-5 font-lora text-[15.5px] leading-[2] text-ink"
      data-dragging-active={Boolean(dragState)}
      aria-label="Annotated text with highlighted entities"
    >
      <div
        aria-hidden="true"
        className={
          dragState
            ? "absolute inset-0 z-20 overflow-hidden whitespace-pre-wrap px-6 py-5 font-lora text-[15.5px] leading-[2] text-transparent select-none"
            : "pointer-events-none absolute inset-0 z-20 overflow-hidden whitespace-pre-wrap px-6 py-5 font-lora text-[15.5px] leading-[2] text-transparent select-none"
        }
      >
        {mirrorChars.map(({ char, index }) => (
          <span key={index} data-char-index={index} className="inline">
            {char === " " ? "\u00a0" : char}
          </span>
        ))}
      </div>
      <div className="relative z-10">
        {segments.map((seg, i) => {
          if (!seg.entity) {
            return <span key={i}>{seg.text}</span>;
          }
          const cfg = ENTITY_CONFIG[seg.entity.entity_type];
          const pct = Math.round(seg.entity.confidence * 100);
          const isDragging = dragState?.resolvedIndex === seg.resolvedIndex;
          return (
            <span
              key={i}
              className="entity-highlight"
              data-draggable={Boolean(onEntitiesChange)}
              data-dragging={isDragging}
              style={{
                background: cfg.bg,
                outline: `1.5px solid ${cfg.border}`,
              }}
              title={`${cfg.label} · ${pct}% confidence`}
              aria-label={`${seg.text} — ${cfg.label}, ${pct}% confidence`}
            >
              <span className="entity-highlight-text">{seg.text}</span>
              {onEntitiesChange && seg.resolvedIndex !== undefined && (
                <>
                  <button
                    type="button"
                    className="entity-handle entity-handle-start"
                    onPointerDown={handleDragStart(seg.resolvedIndex, "start")}
                    aria-label={`Resize start of ${seg.entity.entity_type}`}
                  />
                  <button
                    type="button"
                    className="entity-handle entity-handle-end"
                    onPointerDown={handleDragStart(seg.resolvedIndex, "end")}
                    aria-label={`Resize end of ${seg.entity.entity_type}`}
                  />
                </>
              )}
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
    </div>
  );
}
