import type { EntityType, EntityConfig } from "@/types/ner";

export const ENTITY_CONFIG: Record<EntityType, EntityConfig> = {
  PERSON: {
    label: "Person",
    description: "People, including fictional characters.",
    bg: "#FBEAF0",
    border: "#D4537E",
    text: "#712B13",
  },
  NORP: {
    label: "Nationality",
    description: "Nationalities, religious, or political groups.",
    bg: "#EEEDFE",
    border: "#7F77DD",
    text: "#3C3489",
  },
  FAC: {
    label: "Facility",
    description: "Buildings, airports, highways, bridges, etc.",
    bg: "#E1F5EE",
    border: "#1D9E75",
    text: "#085041",
  },
  ORG: {
    label: "Organization",
    description: "Companies, agencies, institutions, etc.",
    bg: "#FAEEDA",
    border: "#EF9F27",
    text: "#633806",
  },
  GPE: {
    label: "Geopolitical",
    description: "Countries, cities, states.",
    bg: "#FCEBEB",
    border: "#E24B4A",
    text: "#791F1F",
  },
  LOC: {
    label: "Location",
    description: "Non-GPE locations, mountain ranges, bodies of water.",
    bg: "#E6F1FB",
    border: "#378ADD",
    text: "#042C53",
  },
  PRODUCT: {
    label: "Product",
    description: "Objects, vehicles, foods, etc. (Not services).",
    bg: "#EAF3DE",
    border: "#639922",
    text: "#173404",
  },
  EVENT: {
    label: "Event",
    description: "Named hurricanes, battles, wars, sports events.",
    bg: "#FAECE7",
    border: "#D85A30",
    text: "#4A1B0C",
  },
  WORK_OF_ART: {
    label: "Work of Art",
    description: "Titles of books, songs, etc.",
    bg: "#FBEAF0",
    border: "#D4537E",
    text: "#4B1528",
  },
  LAW: {
    label: "Law",
    description: "Named documents made into laws.",
    bg: "#F1EFE8",
    border: "#888780",
    text: "#2C2C2A",
  },
  LANGUAGE: {
    label: "Language",
    description: "Any named language.",
    bg: "#E1F5EE",
    border: "#5DCAA5",
    text: "#04342C",
  },
  DATE: {
    label: "Date",
    description: "Absolute or relative dates or periods.",
    bg: "#FAEEDA",
    border: "#BA7517",
    text: "#412402",
  },
  TIME: {
    label: "Time",
    description: "Times smaller than a day.",
    bg: "#EAF3DE",
    border: "#97C459",
    text: "#173404",
  },
  PERCENT: {
    label: "Percent",
    description: 'Percentage, including "%".',
    bg: "#E6F1FB",
    border: "#85B7EB",
    text: "#042C53",
  },
  MONEY: {
    label: "Money",
    description: "Monetary values, including unit.",
    bg: "#FCEBEB",
    border: "#F09595",
    text: "#501313",
  },
  QUANTITY: {
    label: "Quantity",
    description: "Measurements, as weight or distance.",
    bg: "#EEEDFE",
    border: "#AFA9EC",
    text: "#26215C",
  },
  ORDINAL: {
    label: "Ordinal",
    description: '"first", "second", etc.',
    bg: "#EAF3DE",
    border: "#C0DD97",
    text: "#27500A",
  },
  CARDINAL: {
    label: "Cardinal",
    description: "Numerals that do not fall under another type.",
    bg: "#F1EFE8",
    border: "#B4B2A9",
    text: "#444441",
  },
};

export const SAMPLE_TEXTS = [
  {
    label: "News",
    text: `Si Gobernador Arthur Defensor Jr. nagpahayag sang iya suporta sa bag-o nga ordinansa sang Lalawigan sang Iloilo. Gin-liwat niya nga ang Provincial Capitol sa Iloilo City nagahanda na para sa ika-120 anibersaryo sang pagtukod sang probinsya sang Setyembre 2026.`,
  },
  {
    label: "History",
    text: `Ang bayani sang Pilipinas nga si Jose Rizal, nga taga-Calamba, Laguna, nagsulat sang Noli Me Tangere kag El Filibusterismo didto sa Espanya. Ini nga libro ginpublikar sang Garnier Freres sa Paris sang tuig 1887.`,
  },
  {
    label: "Event",
    text: `Ang Iloilo City Dinagyang Festival, nga ginakilala sang United Nations Educational, Scientific and Cultural Organization, mapahiwas sa buwan sang Enero sa SM City Iloilo. Mga 50,000 ka turista ang ginapatubas sini ka tuig.`,
  },
];

export const DEMO_RESULTS: Record<number, Array<{ text: string; entity_type: EntityType; confidence: number }>> = {
  0: [
    { text: "Arthur Defensor Jr.", entity_type: "PERSON", confidence: 0.9712 },
    { text: "Lalawigan sang Iloilo", entity_type: "GPE", confidence: 0.9401 },
    { text: "Iloilo City", entity_type: "GPE", confidence: 0.9832 },
    { text: "ika-120 anibersaryo", entity_type: "ORDINAL", confidence: 0.8701 },
    { text: "Setyembre 2026", entity_type: "DATE", confidence: 0.9215 },
    { text: "Provincial Capitol", entity_type: "FAC", confidence: 0.8903 },
  ],
  1: [
    { text: "Jose Rizal", entity_type: "PERSON", confidence: 0.9934 },
    { text: "Pilipinas", entity_type: "GPE", confidence: 0.9821 },
    { text: "Calamba, Laguna", entity_type: "GPE", confidence: 0.9512 },
    { text: "Noli Me Tangere", entity_type: "WORK_OF_ART", confidence: 0.9612 },
    { text: "El Filibusterismo", entity_type: "WORK_OF_ART", confidence: 0.9501 },
    { text: "Espanya", entity_type: "GPE", confidence: 0.9703 },
    { text: "Garnier Freres", entity_type: "ORG", confidence: 0.8812 },
    { text: "Paris", entity_type: "GPE", confidence: 0.9901 },
    { text: "1887", entity_type: "DATE", confidence: 0.9234 },
  ],
  2: [
    { text: "Iloilo City Dinagyang Festival", entity_type: "EVENT", confidence: 0.9612 },
    { text: "United Nations Educational, Scientific and Cultural Organization", entity_type: "ORG", confidence: 0.9923 },
    { text: "Enero", entity_type: "DATE", confidence: 0.9134 },
    { text: "SM City Iloilo", entity_type: "FAC", confidence: 0.9023 },
    { text: "50,000", entity_type: "CARDINAL", confidence: 0.9312 },
  ],
};
