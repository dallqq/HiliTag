import type { PredictRequest, PredictResponse, NEREntity, EntityType } from "@/types/ner";
import { SAMPLE_TEXTS, DEMO_RESULTS } from "@/lib/entityConfig";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("hilitag_api_url");
    if (saved) return saved.trim().replace(/\/+$/, "");
  }
  return (process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000").replace(/\/+$/, "");
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    const clean = url.trim().replace(/\/+$/, "");
    if (clean) {
      localStorage.setItem("hilitag_api_url", clean);
    } else {
      localStorage.removeItem("hilitag_api_url");
    }
  }
}

// Built-in entity dictionary for offline demonstration fallback
const KNOWN_ENTITIES: Array<{ text: string; entity_type: EntityType; confidence: number }> = [
  { text: "Arthur Defensor Jr.", entity_type: "PERSON", confidence: 0.9712 },
  { text: "Jerry Treñas", entity_type: "PERSON", confidence: 0.9654 },
  { text: "Jose Rizal", entity_type: "PERSON", confidence: 0.9934 },
  { text: "Panay News", entity_type: "ORG", confidence: 0.9421 },
  { text: "Department of Public Works and Highways", entity_type: "ORG", confidence: 0.9512 },
  { text: "United Nations Educational, Scientific and Cultural Organization", entity_type: "ORG", confidence: 0.9923 },
  { text: "Garnier Freres", entity_type: "ORG", confidence: 0.8812 },
  { text: "Provincial Capitol", entity_type: "LOCATION", confidence: 0.8903 },
  { text: "Capitol building", entity_type: "LOCATION", confidence: 0.8850 },
  { text: "Iloilo City", entity_type: "LOCATION", confidence: 0.9832 },
  { text: "Lalawigan sang Iloilo", entity_type: "LOCATION", confidence: 0.9401 },
  { text: "SM City Iloilo", entity_type: "LOCATION", confidence: 0.9023 },
  { text: "Barangay San Rafael", entity_type: "LOCATION", confidence: 0.9124 },
  { text: "Barangay Balantang", entity_type: "LOCATION", confidence: 0.9087 },
  { text: "Panay", entity_type: "LOCATION", confidence: 0.9341 },
  { text: "Pilipinas", entity_type: "LOCATION", confidence: 0.9821 },
  { text: "Calamba, Laguna", entity_type: "LOCATION", confidence: 0.9512 },
  { text: "Espanya", entity_type: "LOCATION", confidence: 0.9703 },
  { text: "Paris", entity_type: "LOCATION", confidence: 0.9901 },
  { text: "Noli Me Tangere", entity_type: "EVENT", confidence: 0.9612 },
  { text: "El Filibusterismo", entity_type: "EVENT", confidence: 0.9501 },
  { text: "Dinagyang Festival", entity_type: "EVENT", confidence: 0.9612 },
  { text: "Iloilo City Dinagyang Festival", entity_type: "EVENT", confidence: 0.9612 },
  { text: "Enero", entity_type: "DATETIME", confidence: 0.9134 },
  { text: "1887", entity_type: "DATETIME", confidence: 0.9234 },
  { text: "Setyembre 2026", entity_type: "DATETIME", confidence: 0.9215 },
  { text: "ika-120 anibersaryo", entity_type: "DATETIME", confidence: 0.8701 },
];

function findOfflineDemoEntities(text: string): NEREntity[] {
  // Check if text matches one of the sample texts exactly or closely
  for (let i = 0; i < SAMPLE_TEXTS.length; i++) {
    const sample = SAMPLE_TEXTS[i];
    if (text.trim() === sample.text.trim() || text.includes(sample.text.slice(0, 40))) {
      const demoList = DEMO_RESULTS[i] || [];
      const entities: NEREntity[] = [];
      for (const item of demoList) {
        let searchIndex = 0;
        while (searchIndex < text.length) {
          const start = text.indexOf(item.text, searchIndex);
          if (start === -1) break;
          const end = start + item.text.length;
          entities.push({
            text: item.text,
            entity_type: item.entity_type,
            label: item.entity_type,
            confidence: item.confidence,
            start,
            end,
          });
          searchIndex = end;
        }
      }
      return entities;
    }
  }

  // Otherwise match known Hiligaynon entities dictionary
  const entities: NEREntity[] = [];
  for (const item of KNOWN_ENTITIES) {
    let searchIndex = 0;
    while (searchIndex < text.length) {
      const start = text.indexOf(item.text, searchIndex);
      if (start === -1) break;
      const end = start + item.text.length;
      entities.push({
        text: item.text,
        entity_type: item.entity_type,
        label: item.entity_type,
        confidence: item.confidence,
        start,
        end,
      });
      searchIndex = end;
    }
  }

  // Sort by start position
  return entities.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
}

export async function predictEntities(text: string): Promise<PredictResponse> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/predict`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error(`Backend returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as PredictResponse;
    if (data.status === "error") {
      throw new Error(data.error || "Server validation rejected the payload.");
    }
    return data;
  } catch (netErr: any) {
    console.warn(`Could not reach live backend at ${endpoint}: ${netErr?.message}. Checking offline demo entities.`);
    
    // Attempt offline demo fallback
    const offlineEntities = findOfflineDemoEntities(text);
    if (offlineEntities.length > 0) {
      return {
        status: "success",
        model: "best_model (offline demo showcase)",
        language: "hil",
        entities: offlineEntities,
      };
    }

    // If no entities matched offline and backend is down, provide actionable message
    throw new Error(
      `Cannot connect to Flask inference backend at ${baseUrl}. If running locally, ensure "python app/backend/app.py" is started. You can also click one of the sample texts to see an instant demonstration!`
    );
  }
}
