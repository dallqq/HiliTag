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
    title: "Panay News — Sample",
    text: PANAY_NEWS_SAMPLE_TEXT,
    entities: [],
    createdAt: Date.UTC(2026, 4, 16, 8, 0, 0),
  },
  {
    id: "sample-dummy-test-1",
    title: "Dummy Test Document",
    text: "Maria Santos visited Iloilo City on Monday. She met with the team at HiliTag Labs. The group discussed a new model at the Provincial Capitol. Later, they sent a report to the Department of Public Works and Highways. By evening, everyone had dinner at SM City Iloilo.",
    entities: [
      {
        text: "Maria Santos",
        entity_type: "PERSON",
        label: "Person",
        confidence: 1,
        start: 0,
        end: 12,
      },
      {
        text: "Iloilo City",
        entity_type: "LOCATION",
        label: "Location",
        confidence: 1,
        start: 21,
        end: 32,
      },
      {
        text: "Monday",
        entity_type: "DATETIME",
        label: "Datetime",
        confidence: 1,
        start: 36,
        end: 42,
      },
      {
        text: "HiliTag Labs",
        entity_type: "ORG",
        label: "Organization",
        confidence: 1,
        start: 69,
        end: 81,
      },
      {
        text: "Provincial Capitol",
        entity_type: "LOCATION",
        label: "Location",
        confidence: 1,
        start: 122,
        end: 140,
      },
      {
        text: "Department of Public Works and Highways",
        entity_type: "ORG",
        label: "Organization",
        confidence: 1,
        start: 175,
        end: 214,
      },
      {
        text: "SM City Iloilo",
        entity_type: "LOCATION",
        label: "Location",
        confidence: 1,
        start: 251,
        end: 265,
      },
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
  return docs.map((doc) => {
    const isPanaySample = doc.id === "sample-panay-news-1";
    const normalizedEntities = mergeAdjacentEntities(doc.text, doc.entities);
    const sampleText = isPanaySample ? PANAY_NEWS_SAMPLE_TEXT : doc.text;
    const sampleTitle = isPanaySample ? "Panay News — Sample" : doc.title;

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