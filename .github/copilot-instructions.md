# Global Copilot Instructions: Hiligaynon NER Project

This file establishes the global context, tech stack, and coding standards for the Named Entity Recognition (NER) pipeline for the low-resource Hiligaynon language. 

## 1. Tech Stack
- **Machine Learning / NLP:** PyTorch, Hugging Face Transformers (`xlm-roberta-base`), `seqeval` (for evaluation), `spacy` (tokenization), CRF (Baseline).
- **Backend (Inference API):** Python, Flask, Flask-CORS.
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS.
- **Data Collection & Annotation:** BeautifulSoup (Web Scraping - Panay News, Wikipedia), Label Studio.

## 2. Architectural Patterns
- **Decoupled Client-Server:** The Next.js frontend strictly communicates with the Flask backend via RESTful APIs (e.g., `/api/predict`).
- **Data Logging:** Model predictions and user inputs are logged locally via JSON Lines (`predictions_log.jsonl`) on the backend for auditability and further error analysis.
- **Pipeline Segregation:** Data scraping, preprocessing/tokenization, model training, and the inference API must remain cleanly separated into modular scripts/directories (`scraper/`, `preprocessing/`, `training/`, `app/`).

## 3. NLP Specific Requirements & Constraints
- **Tagging Scheme:** Use the **BIOES** (Begin, Inside, Outside, End, Single) scheme mapped to the 18 OntoNotes 5.0 categories. Stricter sequence boundaries are preferred over standard BIO.
- **Tokenization:** ALWAYS initialize tokenizers using `spacy.blank("xx")` to handle word boundaries. 
- **Morphological Preservation:** CRITICAL - **Do not** strip or split Hiligaynon affixes (e.g., `nag-`, `gin-`, `pag-`). The contextual grammar must remain intact for the transformer model.

## 4. Coding Standards
- **Frontend (Next.js/React):** 
  - Always use functional components and React Hooks.
  - Utilize Next.js App Router constructs.
  - Apply styling exclusively using Tailwind CSS utility classes.
  - Enforce strict typing using TypeScript interfaces/types for all API payloads and props.
- **Backend (Flask/Python):** 
  - Keep endpoints lightweight. Offload model loading to application startup, not per-request.
  - Use comprehensive `try/except` blocks for model inference to prevent API crashes on unpredictable text inputs.
- **Evaluation & Testing:** 
  - Exclusively rely on the `seqeval` library for tracking precision, recall, and F1-score across entity levels.
  - Testing must be strictly evaluated against the 20% manual "Gold Standard" test set.
  - Track and note confusion matrix hotspots (e.g., confusing GPE [Geo-Political Entity] with ORG [Organization] or handling Taglish code-mixing).