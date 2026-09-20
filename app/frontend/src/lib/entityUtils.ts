import type { NEREntity } from "@/types/ner";

interface ResolvedSpan {
  entity: NEREntity;
  start: number;
  end: number;
  originalIndex: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveSpan(text: string, entity: NEREntity, originalIndex: number): ResolvedSpan | null {
  if (typeof entity.start !== "number" || typeof entity.end !== "number") {
    return null;
  }

  const start = clamp(Math.floor(entity.start), 0, text.length);
  const end = clamp(Math.floor(entity.end), start + 1, text.length);

  if (start >= end) {
    return null;
  }

  return { entity, start, end, originalIndex };
}

function isJoinableGap(gapText: string) {
  return gapText.length === 0 || /^[\s.,;:!?"'()\-\/]+$/u.test(gapText);
}

export function mergeAdjacentEntities(text: string, entities: NEREntity[]): NEREntity[] {
  if (entities.length < 2) {
    return entities.map((entity) => ({ ...entity }));
  }

  const resolved = entities.map((entity, originalIndex) => resolveSpan(text, entity, originalIndex));
  if (resolved.some((span) => span === null)) {
    return entities.map((entity) => ({ ...entity }));
  }

  const ordered = resolved
    .filter((span): span is ResolvedSpan => span !== null)
    .sort((a, b) => a.start - b.start || a.originalIndex - b.originalIndex);

  if (!ordered.length) {
    return entities.map((entity) => ({ ...entity }));
  }

  const merged: NEREntity[] = [];
  let current = { ...ordered[0] };
  let confidenceTotal = current.entity.confidence;
  let confidenceCount = 1;

  for (let index = 1; index < ordered.length; index += 1) {
    const next = ordered[index];
    const gapText = text.slice(current.end, next.start);
    const sameKind = current.entity.entity_type === next.entity.entity_type;

    if (sameKind && isJoinableGap(gapText)) {
      current = {
        ...current,
        end: Math.max(current.end, next.end),
      };
      confidenceTotal += next.entity.confidence;
      confidenceCount += 1;
      continue;
    }

    merged.push({
      ...current.entity,
      start: current.start,
      end: current.end,
      text: text.slice(current.start, current.end),
      confidence: confidenceTotal / confidenceCount,
    });

    current = { ...next };
    confidenceTotal = next.entity.confidence;
    confidenceCount = 1;
  }

  merged.push({
    ...current.entity,
    start: current.start,
    end: current.end,
    text: text.slice(current.start, current.end),
    confidence: confidenceTotal / confidenceCount,
  });

  return merged;
}

/**
 * Strips leading and trailing punctuation and non-alphanumeric marks
 * to prevent fragmented entity nodes (e.g. 'Iloilo City,' vs 'Iloilo City.').
 */
export function cleanEntityText(raw: string): string {
  if (!raw) return "";
  let text = raw.trim().replace(/\s+/g, " ");

  // Strip leading punctuation/quotes/brackets
  text = text.replace(/^[\s.,;:!?"'()[\]{}«»“”‘’—–-]+/u, "");
  // Strip trailing punctuation/quotes/brackets
  text = text.replace(/[\s.,;:!?"'()[\]{}«»“”‘’—–-]+$/u, "");

  return text.trim();
}

/**
 * Produces a normalized canonical key for knowledge graph deduplication,
 * stripping leading Hiligaynon markers (si, ni, kay, sa) where appropriate.
 */
export function normalizeCanonicalEntity(value: string, entityType?: string): string {
  let cleaned = cleanEntityText(value);
  if (!cleaned) return "";

  // If entity is PERSON, strip leading grammatical case markers (si, ni, kay)
  if (entityType === "PERSON") {
    cleaned = cleaned.replace(/^(si|ni|kay)\s+/i, "");
  }

  // If entity is LOCATION, strip leading locative marker (sa, didto sa)
  if (entityType === "LOCATION") {
    cleaned = cleaned.replace(/^(didto\s+sa|sa)\s+/i, "");
  }

  return cleaned.trim().toLowerCase();
}