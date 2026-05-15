# IlonggoNER — Hiligaynon Named Entity Recognition

Frontend for the Fine-Tuned XLM-RoBERTa NER system described in the research paper.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Fonts**: Lora (serif, for text display) + DM Sans (UI chrome)
- **Backend**: Flask inference API (proxied via `next.config.mjs`)

## Project Structure

```
src/
├── app/
│   ├── api/predict/route.ts   ← Mock API route (dev only)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Header.tsx             ← Nav + logo
│   ├── Sidebar.tsx            ← Entity legend + session stats
│   ├── TextInput.tsx          ← Textarea + sample buttons
│   ├── AnnotatedText.tsx      ← Inline entity highlights
│   ├── EntityTable.tsx        ← Confidence + type table
│   ├── JsonOutput.tsx         ← Raw JSON /api/predict response
│   ├── ResultsPanel.tsx       ← Tab controller for 3 views
│   ├── ModelStrip.tsx         ← Footer: model info
│   └── NERAnalyzer.tsx        ← Root client component (state)
├── lib/
│   ├── api.ts                 ← fetch('/api/predict') helper
│   ├── entityConfig.ts        ← 18 OntoNotes colors + sample texts
│   └── utils.ts               ← cn() Tailwind merge utility
└── types/
    └── ner.ts                 ← Shared TypeScript types
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connecting to Flask Backend

1. Copy `.env.local.example` → `.env.local`
2. Set `FLASK_API_URL=http://your-flask-server:5000`
3. Delete `src/app/api/predict/route.ts` (the mock route)
4. The rewrite in `next.config.mjs` will proxy `/api/predict` → Flask

### Expected Flask response shape

```json
{
  "status": "success",
  "model": "xlm-roberta-base",
  "language": "hil",
  "entities": [
    {
      "text": "Jose Rizal",
      "entity_type": "PERSON",
      "label": "Person",
      "confidence": 0.9934,
      "start": 4,
      "end": 14
    }
  ]
}
```

## Entity Types (OntoNotes 5.0)

All 18 categories are supported:
PERSON, NORP, FAC, ORG, GPE, LOC, PRODUCT, EVENT, WORK_OF_ART, LAW,
LANGUAGE, DATE, TIME, PERCENT, MONEY, QUANTITY, ORDINAL, CARDINAL
