import type { NEREntity } from "@/types/ner";
import { PANAY_NEWS_SAMPLE_TEXT } from "@/lib/entityConfig";
import { mergeAdjacentEntities } from "@/lib/entityUtils";

export interface SavedDoc {
  id: string;
  title: string;
  text: string;
  entities: NEREntity[];
  createdAt: number;
}

export const SAVED_DOCS_KEY = "hilitag_saved_docs";
export const SAVED_DOCS_UPDATED_EVENT = "hilitag_saved_docs_updated";

const DEFAULT_SAVED_DOCS: SavedDoc[] = [
  {
    id: "sample-panay-news-1",
    title: "Panay News — Infrastructure Report",
    text: PANAY_NEWS_SAMPLE_TEXT,
    entities: [
      { text: "Panay News", entity_type: "ORG", label: "Organization", confidence: 0.98, start: 23, end: 33 },
      { text: "Governor Arthur Defensor Jr.", entity_type: "PERSON", label: "Person", confidence: 0.99, start: 49, end: 77 },
      { text: "Iloilo City", entity_type: "LOCATION", label: "Location", confidence: 0.98, start: 155, end: 166 },
      { text: "Provincial Capitol", entity_type: "LOCATION", label: "Location", confidence: 0.96, start: 186, end: 204 },
      { text: "Capitol building", entity_type: "LOCATION", label: "Location", confidence: 0.92, start: 398, end: 414 },
      { text: "Department of Public Works and Highways", entity_type: "ORG", label: "Organization", confidence: 0.97, start: 458, end: 497 },
      { text: "SM City Iloilo", entity_type: "LOCATION", label: "Location", confidence: 0.95, start: 618, end: 632 },
      { text: "Barangay San Rafael", entity_type: "LOCATION", label: "Location", confidence: 0.94, start: 634, end: 653 },
      { text: "Barangay Balantang", entity_type: "LOCATION", label: "Location", confidence: 0.93, start: 659, end: 677 },
      { text: "Panay", entity_type: "LOCATION", label: "Location", confidence: 0.94, start: 753, end: 758 },
      { text: "Mayor Jerry Treñas", entity_type: "PERSON", label: "Person", confidence: 0.99, start: 846, end: 864 },
      { text: "Panay News", entity_type: "ORG", label: "Organization", confidence: 0.98, start: 1269, end: 1279 },
      { text: "Iloilo City", entity_type: "LOCATION", label: "Location", confidence: 0.98, start: 1373, end: 1384 },
    ],
    createdAt: Date.UTC(2026, 4, 16, 8, 0, 0),
  },
  {
    id: "sample-dinagyang-2",
    title: "Dinagyang Festival — Cultural Briefing",
    text: "Ang Iloilo City Dinagyang Festival, nga ginakilala sang United Nations Educational, Scientific and Cultural Organization, mapahiwas sa buwan sang Enero sa SM City Iloilo. Ginpasalig ni Mayor Jerry Treñas kag sang Provincial Capitol nga handa na ang seguridad para sa mga turista sa Iloilo City kag sa bilog nga Panay.",
    entities: [
      { text: "Iloilo City Dinagyang Festival", entity_type: "EVENT", label: "Event", confidence: 0.99, start: 4, end: 34 },
      { text: "United Nations Educational, Scientific and Cultural Organization", entity_type: "ORG", label: "Organization", confidence: 0.98, start: 56, end: 120 },
      { text: "Enero", entity_type: "DATETIME", label: "Datetime", confidence: 0.95, start: 144, end: 149 },
      { text: "SM City Iloilo", entity_type: "LOCATION", label: "Location", confidence: 0.97, start: 153, end: 167 },
      { text: "Mayor Jerry Treñas", entity_type: "PERSON", label: "Person", confidence: 0.99, start: 183, end: 201 },
      { text: "Provincial Capitol", entity_type: "LOCATION", label: "Location", confidence: 0.96, start: 211, end: 229 },
      { text: "Iloilo City", entity_type: "LOCATION", label: "Location", confidence: 0.98, start: 276, end: 287 },
      { text: "Panay", entity_type: "LOCATION", label: "Location", confidence: 0.95, start: 303, end: 308 },
    ],
    createdAt: Date.UTC(2026, 4, 16, 8, 5, 0),
  },
];

function entitiesEqual(a: NEREntity[], b: NEREntity[]) {
  if (a.length !== b.length) return false;

  return a.every((entity, index) => {
    const other = b[index];
    return (
      entity.text === other.text &&
      entity.entity_type === other.entity_type &&
      entity.label === other.label &&
      entity.confidence === other.confidence &&
      entity.start === other.start &&
      entity.end === other.end
    );
  });
}

function mergeDefaultSavedDocs(docs: SavedDoc[]) {
  const existingIds = new Set(docs.map((doc) => doc.id));
  const missingDefaults = DEFAULT_SAVED_DOCS.filter((doc) => !existingIds.has(doc.id));
  return [...missingDefaults, ...docs];
}

function persistSavedDocuments(docs: SavedDoc[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_DOCS_KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event(SAVED_DOCS_UPDATED_EVENT));
}

function normalizeSavedDocuments(docs: SavedDoc[]) {
  // Replace legacy English dummy document with authentic Hiligaynon Dinagyang document if present
  const migrated = docs.map((doc) => {
    if (doc.id === "sample-dummy-test-1") {
      return DEFAULT_SAVED_DOCS[1];
    }
    if (doc.id === "sample-panay-news-1" && (!doc.entities || doc.entities.length === 0)) {
      return DEFAULT_SAVED_DOCS[0];
    }
    return doc;
  });

  return migrated.map((doc) => {
    const isPanaySample = doc.id === "sample-panay-news-1";
    const isDinagyangSample = doc.id === "sample-dinagyang-2";
    const sampleText = isPanaySample
      ? PANAY_NEWS_SAMPLE_TEXT
      : isDinagyangSample
      ? DEFAULT_SAVED_DOCS[1].text
      : doc.text;
    const sampleTitle = isPanaySample
      ? DEFAULT_SAVED_DOCS[0].title
      : isDinagyangSample
      ? DEFAULT_SAVED_DOCS[1].title
      : doc.title;

    const normalizedEntities = mergeAdjacentEntities(sampleText, doc.entities);

    const needsUpdate =
      !entitiesEqual(doc.entities, normalizedEntities) ||
      sampleText !== doc.text ||
      sampleTitle !== doc.title;

    if (!needsUpdate) {
      return doc;
    }

    return {
      ...doc,
      title: sampleTitle,
      text: sampleText,
      entities: normalizedEntities,
    };
  });
}

export function saveDocumentLocally(doc: Omit<SavedDoc, "id" | "createdAt">): SavedDoc {
  const docs = getSavedDocuments();
  const newDoc: SavedDoc = {
    ...doc,
    entities: mergeAdjacentEntities(doc.text, doc.entities),
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  docs.push(newDoc);
  persistSavedDocuments(docs);
  return newDoc;
}

export function getSavedDocuments(): SavedDoc[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(SAVED_DOCS_KEY);
  if (!stored) {
    persistSavedDocuments(DEFAULT_SAVED_DOCS);
    return DEFAULT_SAVED_DOCS;
  }
  try {
    const docs = JSON.parse(stored) as SavedDoc[];
    const migratedDocs = normalizeSavedDocuments(docs);
    if (migratedDocs.some((doc, index) => doc !== docs[index])) {
      persistSavedDocuments(migratedDocs);
    }

    return migratedDocs;
  } catch {
    persistSavedDocuments(DEFAULT_SAVED_DOCS);
    return DEFAULT_SAVED_DOCS;
  }
}

export function updateSavedDocument(id: string, updates: Partial<SavedDoc>) {
  const docs = getSavedDocuments();
  const index = docs.findIndex((d) => d.id === id);
  if (index > -1) {
    const nextText = updates.text ?? docs[index].text;
    const nextEntities = updates.entities
      ? mergeAdjacentEntities(nextText, updates.entities)
      : docs[index].entities;

    docs[index] = {
      ...docs[index],
      ...updates,
      text: nextText,
      entities: nextEntities,
    };
    persistSavedDocuments(docs);
  }
}

export function deleteSavedDocument(id: string) {
  const docs = getSavedDocuments();
  persistSavedDocuments(docs.filter((d) => d.id !== id));
}