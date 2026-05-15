import type { NEREntity } from "@/types/ner";

export interface SavedDoc {
  id: string;
  title: string;
  text: string;
  entities: NEREntity[];
  createdAt: number;
}

export function saveDocumentLocally(doc: Omit<SavedDoc, "id" | "createdAt">): SavedDoc {
  const docs = getSavedDocuments();
  const newDoc: SavedDoc = {
    ...doc,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  docs.push(newDoc);
  localStorage.setItem("hilitag_saved_docs", JSON.stringify(docs));
  return newDoc;
}

export function getSavedDocuments(): SavedDoc[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("hilitag_saved_docs");
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function updateSavedDocument(id: string, updates: Partial<SavedDoc>) {
  const docs = getSavedDocuments();
  const index = docs.findIndex((d) => d.id === id);
  if (index > -1) {
    docs[index] = { ...docs[index], ...updates };
    localStorage.setItem("hilitag_saved_docs", JSON.stringify(docs));
  }
}

export function deleteSavedDocument(id: string) {
  const docs = getSavedDocuments();
  localStorage.setItem("hilitag_saved_docs", JSON.stringify(docs.filter((d) => d.id !== id)));
}