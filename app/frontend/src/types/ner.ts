// Core entity types used throughout the Hiligaynon NER project.
export type EntityType =
  | "PERSON"
  | "NORP"
  | "ORG"
  | "LOCATION"
  | "EVENT"
  | "DATETIME"
  | "MONEY"
;

export interface NEREntity {
  text: string;
  entity_type: EntityType;
  label: string;
  confidence: number;
  start?: number;
  end?: number;
}

export interface PredictRequest {
  text: string;
}

export interface PredictResponse {
  status: "success" | "error";
  model: string;
  language: string;
  entities: NEREntity[];
  error?: string;
}

export interface EntityConfig {
  label: string;
  description: string;
  bg: string;
  border: string;
  text: string;
}

export interface SessionStats {
  sentences: number;
  totalEntities: number;
}
