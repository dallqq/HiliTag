"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TextInput } from "@/components/TextInput";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ModelStrip } from "@/components/ModelStrip";
import { predictEntities } from "@/lib/api";
import { ENTITY_CONFIG } from "@/lib/entityConfig";
import type { NEREntity, PredictResponse, SessionStats } from "@/types/ner";

export function NERAnalyzer() {
  const [inputText, setInputText] = useState("");
  const [analyzedText, setAnalyzedText] = useState("");
  const [entities, setEntities] = useState<NEREntity[]>([]);
  const [response, setResponse] = useState<PredictResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SessionStats>({
    sentences: 0,
    totalEntities: 0,
  });

  const handleAnalyze = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await predictEntities(text);
      // Hydrate with full label from config
      const enriched: NEREntity[] = result.entities.map((e) => ({
        ...e,
        label: ENTITY_CONFIG[e.entity_type]?.label ?? e.entity_type,
      }));
      setEntities(enriched);
      setAnalyzedText(text);
      setResponse({ ...result, entities: enriched });
      setStats((prev) => ({
        sentences: prev.sentences + 1,
        totalEntities: prev.totalEntities + enriched.length,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  const handleClear = useCallback(() => {
    setInputText("");
    setAnalyzedText("");
    setEntities([]);
    setResponse(null);
    setError(null);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar entities={entities} sessionStats={stats} />

        {/* Main panel */}
        <main className="flex flex-1 flex-col overflow-hidden" aria-label="Analysis panel">
          <TextInput
            value={inputText}
            onChange={setInputText}
            onAnalyze={handleAnalyze}
            onClear={handleClear}
            isLoading={isLoading}
          />

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {error && (
              <div
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
                role="alert"
              >
                <strong>Error:</strong> {error}
              </div>
            )}
            <ResultsPanel
              text={analyzedText}
              entities={entities}
              response={response}
              isLoading={isLoading}
            />
          </div>

          <ModelStrip />
        </main>
      </div>
    </div>
  );
}
