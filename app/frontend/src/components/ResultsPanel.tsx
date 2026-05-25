"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mergeAdjacentEntities } from "@/lib/entityUtils";
import { NERHighlighter } from "./NERHighlighter";
import { EntityTable } from "./EntityTable";
import { JsonOutput } from "./JsonOutput";
import type { NEREntity, PredictResponse } from "@/types/ner";
import { saveDocumentLocally } from "@/lib/storage";

type Tab = "annotated" | "table" | "json";

const TABS: { id: Tab; label: string }[] = [
  { id: "annotated", label: "Annotated text" },
  { id: "table", label: "Entity table" },
  { id: "json", label: "JSON output" },
];

interface ResultsPanelProps {
  text: string;
  entities: NEREntity[];
  response: PredictResponse | null;
  isLoading: boolean;
}

export function ResultsPanel({
  text,
  entities,
  response,
  isLoading,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("annotated");
  const [saved, setSaved] = useState(false);
  const [editableEntities, setEditableEntities] = useState<NEREntity[]>(entities);

  useEffect(() => {
    setEditableEntities(mergeAdjacentEntities(text, entities));
  }, [entities, text]);

  const mergedEntities = mergeAdjacentEntities(text, editableEntities);

  const handleEntitiesChange = (nextEntities: NEREntity[]) => {
    setEditableEntities(mergeAdjacentEntities(text, nextEntities));
  };

  const handleSave = () => {
    if (!text) return;
    const titlePrompt = prompt(
      "Enter a title for this document:",
      `Analyzed Doc - ${new Date().toLocaleTimeString()}`
    );

    if (titlePrompt !== null) {
      saveDocumentLocally({
        title: titlePrompt || "Untitled Document",
        text,
        entities: mergedEntities,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <svg
          className="animate-spin text-accent"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-label="Loading"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p className="text-[13px] text-ink-muted">
          Running inference with xlm-roberta-base…
        </p>
      </div>
    );
  }

  if (!entities.length && !text) {
    return <EmptyState />;
  }

  const displayedResponse = response
    ? {
        ...response,
        entities: mergedEntities,
      }
    : null;

  return (
    <div>
      <div
        className="mb-6 flex gap-0 border-b border-[rgba(139,69,19,0.15)]"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "-mb-px border-b-2 px-[18px] pb-2 pt-[8px] text-[13px] transition-all",
              activeTab === tab.id
                ? "border-accent font-medium text-accent"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4 pb-2 text-[12px]">
          {editableEntities.length > 0 && (
            <span className="text-ink-faint">
              {editableEntities.length} entit{editableEntities.length === 1 ? "y" : "ies"} found
            </span>
          )}
          {text && (
            <button
              onClick={handleSave}
              disabled={saved}
              className="rounded bg-accent/10 px-3 py-1 font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
            >
              {saved ? "Saved!" : "Save Document"}
            </button>
          )}
        </div>
      </div>

      {activeTab === "annotated" && (
        <div role="tabpanel" aria-label="Annotated text">
          {text ? (
            <NERHighlighter
              text={text}
              entities={mergedEntities}
              onEntitiesChange={handleEntitiesChange}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      )}

      {activeTab === "table" && (
        <div role="tabpanel" aria-label="Entity table">
          <EntityTable entities={mergedEntities} />
        </div>
      )}

      {activeTab === "json" && (
        <div role="tabpanel" aria-label="JSON output">
          {displayedResponse ? (
            <JsonOutput response={displayedResponse} />
          ) : (
            <p className="text-[13px] text-ink-muted">No data yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent-light text-accent">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      </div>
      <h2 className="font-lora text-[17px] font-medium text-ink">
        Ready to analyze
      </h2>
      <p className="max-w-[340px] text-[13px] leading-relaxed text-ink-muted">
        Enter a Hiligaynon text passage above and click &ldquo;Analyze text&rdquo; to extract named entities using XLM-RoBERTa.
      </p>
    </div>
  );
}
