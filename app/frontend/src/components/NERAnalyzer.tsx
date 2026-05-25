"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TextInput } from "@/components/TextInput";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ModelStrip } from "@/components/ModelStrip";
import { predictEntities } from "@/lib/api";
import { ENTITY_CONFIG } from "@/lib/entityConfig";
import { mergeAdjacentEntities } from "@/lib/entityUtils";
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
      const mergedEntities = mergeAdjacentEntities(text, enriched);
      setEntities(mergedEntities);
      setAnalyzedText(text);
      setResponse({ ...result, entities: mergedEntities });
      setStats((prev) => ({
        sentences: prev.sentences + 1,
        totalEntities: prev.totalEntities + mergedEntities.length,
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
            {error ? (
              <div
                className="mb-6 flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/50 p-8 text-center text-red-800"
                role="alert"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="mb-1 text-lg font-semibold text-red-900">Application Error</h3>
                <p className="max-w-md text-[14px] leading-relaxed text-red-700/80">
                  {error.includes('API error') || error.includes('fetch') || error.includes('network') 
                    ? "The HiliTag AI model is currently offline or unreachable. Please ensure the Flask inference service is running correctly on the backend." 
                    : error}
                </p>
              </div>
            ) : (
              <ResultsPanel
                text={analyzedText}
                entities={entities}
                response={response}
                isLoading={isLoading}
              />
            )}
          </div>

          <ModelStrip />
        </main>
      </div>
    </div>
  );
}
