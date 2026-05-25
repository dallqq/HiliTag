# HiliTag

HiliTag is a Hiligaynon named entity recognition system built as a full pipeline rather than a single model demo. The repository combines data preparation, tokenization, training, evaluation, and a two-tier application stack composed of a Flask inference service and a Next.js frontend.

The project is designed around low-resource Hiligaynon text. It preserves affixes such as `nag-` and `gin-` during tokenization, uses BIOES tagging for stricter boundary control, and evaluates entity-level performance with `seqeval`.

## Research Scope

The current implementation supports the following research and application goals:

- construct a clean Hiligaynon corpus from raw text sources
- produce silver and gold dataset splits with reproducible partitioning
- convert Label Studio exports into token-level BIOES sequences
- train a transformer-based NER model with an XLM-RoBERTa backbone
- maintain a CRF baseline for comparison
- evaluate predictions on a held-out gold test split
- analyze systematic errors through confusion-matrix notebooks and token-level misclassification inspection
- expose the model through a Flask API and a browser-based analysis interface

## System Architecture

The repository is organized into four primary layers.

### 1. Data preparation

Raw sentences are collected, normalized, deduplicated, split, and converted into token-level sequence labeling formats.

- [scripts/clean_dataset.py](scripts/clean_dataset.py) normalizes quotes, removes URLs and emails, filters noisy lines, and deduplicates the corpus.
- [scripts/split_dataset.py](scripts/split_dataset.py) performs reproducible 80/10/10 splitting with stratification by entity density.
- [preprocessing/json_to_bioes.py](preprocessing/json_to_bioes.py) converts Label Studio JSON exports to CoNLL-style BIOES files.
- [preprocessing/tokenizer.py](preprocessing/tokenizer.py) defines the Hiligaynon-aware tokenizer used throughout preprocessing and inference support code.

### 2. Modeling

Two model families are present in the repository.

- [training/model_xlmr.py](training/model_xlmr.py) initializes an XLM-RoBERTa token-classification model with dynamic label mappings.
- [training/model_crf_baseline.py](training/model_crf_baseline.py) implements a feature-engineered CRF baseline.

The intended production backend serves the transformer checkpoint stored under [training/checkpoints/best_model](training/checkpoints/best_model).

### 3. Evaluation and diagnostics

Evaluation is explicit and test-split driven.

- [evaluation/eval_script.py](evaluation/eval_script.py) computes seqeval metrics on the gold test split.
- [evaluation/confusion_matrix.ipynb](evaluation/confusion_matrix.ipynb) visualizes confusion patterns and isolates recurring errors such as ORG vs LOCATION and Taglish/code-switching failures.

### 4. Application layer

The deployed application is decoupled.

- [app/backend/app.py](app/backend/app.py) serves the NER model through Flask and logs predictions to JSONL.
- [app/frontend/src/app/page.tsx](app/frontend/src/app/page.tsx) mounts the browser interface.
- [app/frontend/src/lib/api.ts](app/frontend/src/lib/api.ts) sends prediction requests through the Next.js rewrite path.
- [app/frontend/next.config.mjs](app/frontend/next.config.mjs) proxies `/api/predict` to the Flask backend.

## Data and Labeling Workflow

The project expects a staged dataset process:

1. Scrape or collect raw Hiligaynon text into `data/raw_sentences.txt`.
2. Clean and deduplicate the text into `data/clean_sentences.txt`.
3. Generate a pre-annotated JSON corpus such as `data/dataset_all_sentences_pre_annotated.json`.
4. Split the corpus into train, validation, and test subsets with fixed randomness.
5. Manually verify validation and test subsets in Label Studio.
6. Convert the verified annotations into CoNLL files under `data/converted_verified/`.
7. Train and evaluate models on the resulting sequence-labeling data.

The preprocessing code discards overlapping annotations conservatively and maps character offsets to token spans using the repository tokenizer. This is important because the project emphasizes morphological preservation and avoids splitting valid Hiligaynon affixes.

## Label and Output Conventions

The preprocessing and training stack uses BIOES tags for sequence labeling.

At the application layer, backend outputs are normalized to a smaller display set used by the frontend:

- PERSON
- ORG
- LOCATION
- EVENT
- DATETIME
- MONEY

Location-like labels such as GPE, LOC, and FAC are normalized to LOCATION. Date and time expressions are normalized to DATETIME.

## Frontend Behavior

The Next.js application is an interactive inspection tool rather than a passive demo page.

- The main analyzer accepts free-form Hiligaynon text and calls the backend prediction endpoint.
- Extracted entities are highlighted inline and may be resized or removed in the UI.
- A table view exposes entity type and confidence data.
- A raw JSON view is available for inspection and debugging.
- Saved documents are kept in localStorage and can be revisited or edited.
- A knowledge graph view derives nodes and edges from saved analyses.

The frontend currently relies on a Next.js rewrite for `/api/predict`. There is no separate Next API route file in the workspace.

## Backend Behavior

The Flask service loads the transformer checkpoint at startup and exposes two endpoints.

- `POST /api/predict` accepts a JSON payload with a `text` field and returns structured entity predictions.
- `GET /health` reports backend availability and the loaded model name.

Each request is logged to [app/backend/predictions_log.jsonl](app/backend/predictions_log.jsonl). The backend is intentionally lightweight and does not load the model per request.

## Repository Layout

- [app/backend](app/backend): Flask API, dependencies, and logs
- [app/frontend](app/frontend): Next.js client application
- [data](data): raw, cleaned, split, and converted datasets
- [evaluation](evaluation): metrics scripts and notebook-based diagnostics
- [preprocessing](preprocessing): tokenization and annotation conversion
- [scripts](scripts): cleaning and splitting utilities
- [training](training): model initialization scripts and checkpoints

## Setup

### Backend

1. Create and activate a Python virtual environment.
2. Install dependencies from [app/backend/requirements.txt](app/backend/requirements.txt).
3. Ensure the model checkpoint exists at [training/checkpoints/best_model](training/checkpoints/best_model), or set `MODEL_PATH` to another checkpoint directory.
4. Start the Flask app from [app/backend/app.py](app/backend/app.py).

### Frontend

1. Install dependencies in [app/frontend](app/frontend).
2. Set `NEXT_PUBLIC_FLASK_API_URL` if the Flask service is not running on `http://localhost:5000`.
3. Start the Next.js application from the frontend workspace.

## Environment Variables

- `MODEL_PATH`: optional override for the backend checkpoint directory
- `NEXT_PUBLIC_FLASK_API_URL`: backend base URL used by the Next.js rewrite
- `NEXT_PUBLIC_GITHUB_REPO`: repository link shown in the UI header

## Evaluation

Use [evaluation/eval_script.py](evaluation/eval_script.py) to generate entity-level reports on the test split. Use [evaluation/confusion_matrix.ipynb](evaluation/confusion_matrix.ipynb) to inspect failure modes that are not visible in aggregate metrics.

The notebook is especially relevant for the following questions:

- which entity pairs are most frequently confused
- whether the model collapses LOCATION-like spans into ORG or vice versa
- how Taglish or code-mixed passages affect predictions
- which token-level boundary errors remain after BIOES conversion

## Notes on Current Implementation

- The repository contains both research artifacts and application code, so not every script is meant to run in the same execution environment.
- The active production path is transformer-only; the Flask backend no longer depends on the CRF baseline for inference.
- The frontend assumes the backend model can be reached through the rewrite configured in [app/frontend/next.config.mjs](app/frontend/next.config.mjs).

## Suggested Run Order

For a clean end-to-end workflow, use this order:

1. Prepare and verify the dataset.
2. Train or restore the XLM-RoBERTa checkpoint.
3. Run the evaluation script.
4. Start the Flask backend.
5. Start the Next.js frontend.
6. Inspect saved analyses and error diagnostics.
