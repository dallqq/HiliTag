import type { PredictRequest, PredictResponse } from "@/types/ner";

const API_BASE_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000";

export async function predictEntities(text: string): Promise<PredictResponse> {
  const body: PredictRequest = { text };

  try {
    // Attempt to hit the Next.js rewrite proxy first, fallback to direct Flask backend URL on CORS issues
    const useProxy = typeof window !== 'undefined' && window.location.pathname !== '';
    const endpoint = useProxy ? "/api/predict" : `${API_BASE_URL}/api/predict`;

    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`API status ${res.status}: ${res.statusText}`);
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json() as PredictResponse;
    if (data.status === "error") {
      throw new Error(data.error || "Server validation rejected the payload.");
    }
    return data;
  } catch (error: any) {
    console.error("Predict fetch error:", error);
    // Bubble up error to UI layer
    throw new Error(error.message || "An unexpected network error occurred.");
  }
}
