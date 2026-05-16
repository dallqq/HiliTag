"use client";

import { useState, useEffect, useMemo } from "react";
import { getSavedDocuments, deleteSavedDocument, updateSavedDocument, type SavedDoc } from "@/lib/storage";
import { NERHighlighter } from "./NERHighlighter";
import { EntityTable } from "./EntityTable";

export function SavedDocuments({ onEditAnalyze }: { onEditAnalyze: (text: string) => void }) {
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedDocument(id);
    const newDocs = getSavedDocuments();
    setDocs(newDocs);
  };

  const handleUpdateEntities = (newEntities: any[]) => {
    if (!selectedDoc) return;
    updateSavedDocument(selectedDoc.id, { entities: newEntities });
    setDocs(getSavedDocuments());
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-[300px] flex-shrink-0 border-r border-[rgba(139,69,19,0.15)] bg-paper-warm p-4 overflow-y-auto">
        <h2 className="mb-4 font-lora text-[15px] font-semibold text-ink">Saved Documents</h2>
        <div className="mb-3">
          <label htmlFor="saved-search" className="sr-only">Search saved documents</label>
          <div className="relative">
            <input
              id="saved-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, text or entities..."
              className="w-full rounded-md border border-[rgba(139,69,19,0.1)] bg-white px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No documents match your search.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className={`group flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-all ${
                  selectedId === doc.id
                    ? 'border-accent bg-paper shadow-sm'
                    : 'border-[rgba(139,69,19,0.1)] bg-paper hover:border-[rgba(139,69,19,0.3)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="line-clamp-1 font-lora text-[14px] font-medium text-ink">{doc.title}</h3>
                  <button 
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
                <p className="text-[11px] text-ink-muted">
                  {new Date(doc.createdAt).toLocaleDateString()} • {doc.entities.length} entities
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main View */}
      <div className="flex flex-1 flex-col overflow-y-auto p-8">
        {selectedDoc ? (
          <div className="mx-auto w-full max-w-4xl">
             <div className="mb-6 flex items-center justify-between border-b border-[rgba(139,69,19,0.15)] pb-4">
                <h1 className="font-lora text-2xl font-semibold text-ink">{selectedDoc.title}</h1>
             </div>
             <div className="mb-8">
                <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.06em] text-ink-muted">Document Text</h2>
                <div className="rounded-xl border border-[rgba(139,69,19,0.15)] bg-white p-5 leading-relaxed text-ink shadow-sm">
                     <NERHighlighter
                       text={selectedDoc.text}
                       entities={selectedDoc.entities}
                       onEntitiesChange={(newEntities) => handleUpdateEntities(newEntities)}
                     />
                </div>
             </div>
             
             <div>
                <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.06em] text-ink-muted">Extracted Entities (Editable)</h2>
                 <EntityTable 
                   entities={selectedDoc.entities} 
                   isEditable={true} 
                   showConfidence={false}
                   onChange={(newEntities) => handleUpdateEntities(newEntities)} 
                 />
             </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-ink-muted">
            <svg className="mb-4 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            <p>Select a saved document from the sidebar to view or edit details.</p>
          </div>
        )}
      </div>
    </div>
  );
}