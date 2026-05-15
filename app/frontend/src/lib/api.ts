import type { PredictRequest, PredictResponse } from "@/types/ner";

export async function predictEntities(text: string): Promise<PredictResponse> {
  const body: PredictRequest = { text };

  const res = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<PredictResponse>;
}
