// All 18 OntoNotes 5.0 entity types used in Hiligaynon NER
export type EntityType =
  | "PERSON"
  | "NORP"
  | "FAC"
  | "ORG"
  | "GPE"
  | "LOC"
  | "PRODUCT"
  | "EVENT"
  | "WORK_OF_ART"
  | "LAW"
  | "LANGUAGE"
  | "DATE"
  | "TIME"
  | "PERCENT"
  | "MONEY"
  | "QUANTITY"
  | "ORDINAL"
  | "CARDINAL";

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
