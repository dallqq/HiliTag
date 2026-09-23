"use client";

import { useState, useEffect, useMemo } from "react";
import { getSavedDocuments, deleteSavedDocument, updateSavedDocument, type SavedDoc } from "@/lib/storage";
import { mergeAdjacentEntities } from "@/lib/entityUtils";
import { NERHighlighter } from "./NERHighlighter";
import { EntityTable } from "./EntityTable";

export function SavedDocuments({ onEditAnalyze }: { onEditAnalyze: (text: string) => void }) {
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  
  useEffect(() => {
    setDocs(getSavedDocuments());
  }, []);

  useEffect(() => {
    if (!docs.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }

    const selectedExists = selectedId ? docs.some((doc) => doc.id === selectedId) : false;
    if (!selectedExists) {
      setSelectedId(docs[docs.length - 1].id);
    }
  }, [docs, selectedId]);

  const filteredDocs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      if (d.title.toLowerCase().includes(q)) return true;
      if (d.text.toLowerCase().includes(q)) return true;
      if (d.entities.some((e) => e.text.toLowerCase().includes(q) || e.entity_type.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [docs, searchTerm]);

  const selectedDoc = docs.find((d) => d.id === selectedId);
  const selectedEntities = useMemo(() => {
    if (!selectedDoc) return [];
    return mergeAdjacentEntities(selectedDoc.text, selectedDoc.entities);
  }, [selectedDoc]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedDocument(id);
    const newDocs = getSavedDocuments();
    setDocs(newDocs);
    if (selectedId === id) {
      setMobileView("list");
    }
  };

  const handleUpdateEntities = (newEntities: SavedDoc["entities"]) => {
    if (!selectedDoc) return;
    updateSavedDocument(selectedDoc.id, {
      entities: mergeAdjacentEntities(selectedDoc.text, newEntities),
    });
    setDocs(getSavedDocuments());
  };

  const handleSelectDoc = (id: string) => {
    setSelectedId(id);
    setMobileView("detail");
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Master List (full width on mobile if mobileView === 'list', or sidebar on desktop) */}
      <div
        className={`w-full md:w-[320px] md:flex-shrink-0 border-r border-[rgba(139,69,19,0.15)] bg-paper-warm p-4 overflow-y-auto pb-24 md:pb-4 ${
          mobileView === "detail" ? "hidden md:block" : "block"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-lora text-[16px] md:text-[15px] font-semibold text-ink">
            Saved Documents
          </h2>
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
            {docs.length} total
          </span>
        </div>

        <div className="mb-3">
          <label htmlFor="saved-search" className="sr-only">Search saved documents</label>
          <div className="relative">
            <input
              id="saved-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, text or entities..."
              className="w-full rounded-xl border border-[rgba(139,69,19,0.1)] bg-white px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[12px]"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgba(139,69,19,0.2)] bg-paper/60 p-6 text-center text-[13px] text-ink-muted">
            {searchTerm ? "No documents match your search." : "No saved documents yet. Analyze some text to save!"}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => handleSelectDoc(doc.id)}
                className={`group flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3.5 transition-all active:scale-[0.99] ${
                  selectedId === doc.id
                    ? 'border-accent bg-paper shadow-sm'
                    : 'border-[rgba(139,69,19,0.1)] bg-paper hover:border-[rgba(139,69,19,0.3)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="line-clamp-1 font-lora text-[14.5px] md:text-[14px] font-medium text-ink">
                    {doc.title}
                  </h3>
                  <button 
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="text-red-500 opacity-80 md:opacity-0 md:group-hover:opacity-100 hover:text-red-700 p-1 transition-opacity"
                    title="Delete document"
                    aria-label={`Delete ${doc.title}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-ink-muted">
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  <span className="rounded bg-paper-mid px-1.5 py-0.2 font-medium">
                    {doc.entities.length} entities
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail View (full width on mobile if mobileView === 'detail', or right column on desktop) */}
      <div
        className={`flex-1 flex-col overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedDoc ? (
          <div className="mx-auto w-full max-w-4xl">
            {/* Mobile Navigation Back Header */}
            <div className="mb-4 flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] pb-3 md:hidden">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1.5 rounded-lg border border-[rgba(139,69,19,0.2)] bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink transition hover:bg-paper-mid active:scale-95"
              >
                <span>←</span>
                <span>All Documents</span>
              </button>
              <button
                onClick={() => onEditAnalyze(selectedDoc.text)}
                className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-3 py-1.5 text-[12px] font-semibold text-accent transition hover:bg-accent/20 active:scale-95"
              >
                <span>Analyze in Editor</span>
                <span>→</span>
              </button>
            </div>

            {/* Desktop Header */}
            <div className="mb-6 hidden md:flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] pb-4">
              <h1 className="font-lora text-2xl font-semibold text-ink">{selectedDoc.title}</h1>
              <button
                onClick={() => onEditAnalyze(selectedDoc.text)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/10 px-3.5 py-1.5 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/20"
                title="Open this text in the analyzer"
              >
                <span>Analyze in Editor</span>
                <span>→</span>
              </button>
            </div>

            {/* Mobile Document Title (shown under back bar) */}
            <h1 className="mb-4 font-lora text-xl font-semibold text-ink md:hidden">
              {selectedDoc.title}
            </h1>

            <div className="mb-6 md:mb-8">
              <h2 className="mb-2.5 text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                Document Text
              </h2>
              <div className="rounded-xl border border-[rgba(139,69,19,0.15)] bg-white p-4 md:p-5 leading-relaxed text-ink shadow-sm">
                <NERHighlighter
                  text={selectedDoc.text}
                  entities={selectedEntities}
                  onEntitiesChange={(newEntities) => handleUpdateEntities(newEntities)}
                />
              </div>
            </div>
             
            <div>
              <h2 className="mb-2.5 text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                Extracted Entities (Editable)
              </h2>
              <EntityTable 
                entities={selectedEntities} 
                isEditable={true} 
                showConfidence={false}
                onChange={(newEntities) => handleUpdateEntities(newEntities)} 
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-ink-muted p-8 text-center">
            <svg className="mb-4 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
            <p className="max-w-xs text-[13px]">
              Select a saved document from the list to view or edit details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}