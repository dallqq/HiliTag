import { NextRequest, NextResponse } from "next/server";
import type { PredictResponse, EntityType } from "@/types/ner";
import { ENTITY_CONFIG } from "@/lib/entityConfig";

// ---------------------------------------------------------------------------
// This route is a MOCK for local development.
// In production, next.config.mjs rewrites /api/predict → Flask backend.
// Remove this file once the Flask server is running.
// ---------------------------------------------------------------------------

const DEMO: Record<string, Array<{ text: string; entity_type: EntityType; confidence: number }>> = {
  news: [
    { text: "Arthur Defensor Jr.", entity_type: "PERSON", confidence: 0.9712 },
    { text: "Lalawigan sang Iloilo", entity_type: "GPE", confidence: 0.9401 },
    { text: "Iloilo City", entity_type: "GPE", confidence: 0.9832 },
    { text: "Setyembre 2026", entity_type: "DATE", confidence: 0.9215 },
    { text: "Provincial Capitol", entity_type: "FAC", confidence: 0.8903 },
  ],
  history: [
    { text: "Jose Rizal", entity_type: "PERSON", confidence: 0.9934 },
    { text: "Pilipinas", entity_type: "GPE", confidence: 0.9821 },
    { text: "Noli Me Tangere", entity_type: "WORK_OF_ART", confidence: 0.9612 },
    { text: "El Filibusterismo", entity_type: "WORK_OF_ART", confidence: 0.9501 },
    { text: "Espanya", entity_type: "GPE", confidence: 0.9703 },
    { text: "Garnier Freres", entity_type: "ORG", confidence: 0.8812 },
    { text: "1887", entity_type: "DATE", confidence: 0.9234 },
  ],
};

function pickDemo(text: string) {
  if (text.includes("Rizal") || text.includes("Noli")) return DEMO.history;
  return DEMO.news;
}

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text: string };

  if (!text?.trim()) {
    return NextResponse.json({ status: "error", error: "No text provided." }, { status: 400 });
  }

  // Simulate inference latency
  await new Promise((r) => setTimeout(r, 700));

  const raw = pickDemo(text);
  const entities = raw.map((e) => ({
    ...e,
    label: ENTITY_CONFIG[e.entity_type].label,
  }));

  const body: PredictResponse = {
    status: "success",
    model: "xlm-roberta-base",
    language: "hil",
    entities,
  };

  return NextResponse.json(body);
}
