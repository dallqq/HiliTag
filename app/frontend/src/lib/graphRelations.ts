/**
 * Hiligaynon Relation Extraction Engine
 * Provides sentence-bounded semantic relation extraction and pattern matching
 * tailored specifically for Hiligaynon text in the HiliTag corpus.
 */

export interface ExtractedRelation {
  relation: string;
  confidence: number;
  snippet: string;
  sourceText: string;
  targetText: string;
  isSentenceCooccurrence: boolean;
}

interface TriggerRule {
  id: string;
  label: string;
  weight: number;
  patterns: RegExp[];
}

const HILIGAYNON_RELATION_RULES: TriggerRule[] = [
  {
    id: "visit_travel",
    label: "visited / traveled to",
    weight: 9,
    patterns: [
      /\b(nag-?bisita|nag-?kadto|nag-?byahe|nag-?pauli|nag-?libot|nag-?abot)\b/i,
      /\b(nag-?padulong|nagkadto|nagbisita)\b/i,
      /\b(visited|traveled to|went to)\b/i,
    ],
  },
  {
    id: "meet_discuss",
    label: "met / discussed with",
    weight: 8,
    patterns: [
      /\b(nakig-?kita|nag-?pakigsapol|nagsapol|nag-?sinapol|nag-?istorya|nag-?estorya|nag-?talakay|nag-?pulong)\b/i,
      /\b(met with|discussed with|conferred with)\b/i,
    ],
  },
  {
    id: "announce_report",
    label: "announced / reported",
    weight: 8,
    patterns: [
      /\b(ginpahibalo|ginpahayag|ginsiling|nagreport|ginreport|nagpaandam|ginpaandam|gin-?anunsyo|nagpahayag)\b/i,
      /\b(announced|reported|stated that|declared)\b/i,
    ],
  },
  {
    id: "hold_celebrate",
    label: "held at / celebrated",
    weight: 8,
    patterns: [
      /\b(ginhiwat|naghiwat|mapahiwas|ginpatigayon|ginselebrar|pagselebrar)\b/i,
      /\b(celebrated at|held at|conducted in)\b/i,
    ],
  },
  {
    id: "work_appoint",
    label: "works at / appointed to",
    weight: 7,
    patterns: [
      /\b(naga-?obra|nagaobra|naga-?trabaho|nagatrabaho|gin-?appoint|ginpili|nagserbe|naka-?assign)\b/i,
      /\b(works at|appointed to|serves at)\b/i,
    ],
  },
  {
    id: "collaborate",
    label: "collaborated with",
    weight: 7,
    patterns: [
      /\b(upod sa|kaupod ni|kaupod si|nagbuligay|nag-?ugyon|partner sang|upod kay)\b/i,
      /\b(partnered with|collaborated with|together with)\b/i,
    ],
  },
  {
    id: "located_in",
    label: "located in / based in",
    weight: 6,
    patterns: [
      /\b(didto sa|nahamtang sa|makit-an sa|ara sa|taga-?|nagikan sa|halin sa)\b/i,
      /\b(located in|based in|from)\b/i,
    ],
  },
  {
    id: "association_of",
    label: "associated with / of",
    weight: 5,
    patterns: [
      /\b(katapo sang|opisyal sang|pamuno sang|miyembro sang|lider sang|departamento sang)\b/i,
      /\b(official of|member of|head of)\b/i,
    ],
  },
  {
    id: "beneficiary_for",
    label: "intended for / regarding",
    weight: 4,
    patterns: [
      /\b(para sa|para kay|tuhoy sa|tungod sa|alang-alang sa)\b/i,
      /\b(intended for|concerning|regarding)\b/i,
    ],
  },
];

/**
 * Splits text into sentences, protecting common titles and abbreviations
 * common in Hiligaynon news and administration texts.
 */
export function splitSentencesWithOffsets(text: string): Array<{ text: string; start: number; end: number }> {
  if (!text) return [];

  // Protect abbreviations: Gov., Mayor, Dr., Engr., Atty., Jr., Sr., SM., vs., etc.
  const regex = /([^.!?\n]+[.!?]+(?:\s+|$)|[^\n]+(?:\n+|$))/g;
  const results: Array<{ text: string; start: number; end: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const start = match.index;
    const end = start + raw.length;
    results.push({
      text: trimmed,
      start,
      end,
    });
  }

  if (results.length === 0 && text.trim().length > 0) {
    results.push({
      text: text.trim(),
      start: 0,
      end: text.length,
    });
  }

  return results;
}

export interface MentionSpan {
  text: string;
  start: number;
  end: number;
}

/**
 * Extracts a candidate relation between two entity mention instances within a document text.
 */
export function extractRelationBetweenMentions(
  docText: string,
  mentionA: MentionSpan,
  mentionB: MentionSpan
): ExtractedRelation {
  let left = mentionA;
  let right = mentionB;
  if (mentionA.start > mentionB.start) {
    left = mentionB;
    right = mentionA;
  }

  const betweenRaw = docText.slice(left.end, right.start);
  const between = betweenRaw.replace(/\s+/g, " ").trim();
  const wordDistance = between.length === 0 ? 0 : between.split(/\s+/).length;

  // Check if they are in the same sentence
  const hasParagraphBreak = betweenRaw.includes("\n\n");
  const hasSentenceBreak = /[.!?]\s+[A-Z]/.test(betweenRaw);
  const isSameSentence = !hasParagraphBreak && !hasSentenceBreak && wordDistance <= 25;

  let bestRule: TriggerRule | null = null;
  let bestWeight = 0;

  if (isSameSentence && between.length > 0) {
    for (const rule of HILIGAYNON_RELATION_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(between)) {
          if (rule.weight > bestWeight) {
            bestWeight = rule.weight;
            bestRule = rule;
          }
          break;
        }
      }
    }
  }

  // Create a clean contextual snippet (max 100 characters)
  const snippet = between.length > 0
    ? between.slice(0, 100).replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
    : "adjacent in text";

  if (bestRule) {
    return {
      relation: bestRule.label,
      confidence: Math.min(0.95, 0.65 + bestRule.weight * 0.03),
      snippet,
      sourceText: left.text,
      targetText: right.text,
      isSentenceCooccurrence: true,
    };
  }

  if (isSameSentence) {
    return {
      relation: "co-occurs in sentence",
      confidence: 0.6,
      snippet,
      sourceText: left.text,
      targetText: right.text,
      isSentenceCooccurrence: true,
    };
  }

  return {
    relation: "co-occurs in document",
    confidence: 0.4,
    snippet: snippet.slice(0, 60),
    sourceText: left.text,
    targetText: right.text,
    isSentenceCooccurrence: false,
  };
}

/**
 * Resolves the consensus relation from multiple relation observations across documents.
 * Prioritizes explicit predicate matches over generic co-occurrences.
 */
export function resolveConsensusRelation(relations: ExtractedRelation[]): { relation: string; snippets: string[] } {
  if (!relations.length) {
    return { relation: "related", snippets: [] };
  }

  const snippets: string[] = [];
  const relationScores = new Map<string, number>();

  for (const r of relations) {
    if (r.snippet && !snippets.includes(r.snippet)) {
      snippets.push(r.snippet);
    }

    const currentScore = relationScores.get(r.relation) ?? 0;
    // Boost specific verbs over generic co-occurrence
    let boost = r.confidence;
    if (r.relation !== "co-occurs in sentence" && r.relation !== "co-occurs in document" && r.relation !== "related") {
      boost += 1.5;
    }
    relationScores.set(r.relation, currentScore + boost);
  }

  let topRelation = "co-occurs in document";
  let maxScore = -1;

  for (const [rel, score] of relationScores.entries()) {
    if (score > maxScore) {
      maxScore = score;
      topRelation = rel;
    }
  }

  return {
    relation: topRelation,
    snippets: snippets.slice(0, 5),
  };
}
