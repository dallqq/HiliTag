import json
import logging
import os
import sys
import tempfile
from datetime import datetime
from typing import Dict, List, Optional

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from flask import Flask, jsonify, request
from flask_cors import CORS
from transformers import AutoModelForTokenClassification, AutoTokenizer, PreTrainedTokenizerFast, pipeline

from preprocessing.tokenizer import get_hiligaynon_nlp
# NOTE: CRF baseline removed — enforce transformer-only inference

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TRANSFORMER_MODEL_DIR = os.environ.get(
    "MODEL_PATH", os.path.join(PROJECT_ROOT, "training", "checkpoints", "best_model")
)
LOG_FILE = os.path.join(os.path.dirname(__file__), "predictions_log.jsonl")

VALID_TRANSFORMER_ARTIFACTS = (
    "model.safetensors",
    "pytorch_model.bin",
    "model.safetensors.index.json",
    "pytorch_model.bin.index.json",
)

TOKENIZER_NLP = get_hiligaynon_nlp()

nlp_pipeline = None
model_backend = None
model_name = None


def _has_complete_transformer_checkpoint(model_dir: str) -> bool:
    if not os.path.isdir(model_dir):
        return False

    return any(os.path.exists(os.path.join(model_dir, artifact)) for artifact in VALID_TRANSFORMER_ARTIFACTS)


def _normalize_entity_type(raw_type: str) -> Optional[str]:
    if not raw_type:
        return None

    label = raw_type.upper()
    label = label.replace("LABEL_", "")

    mapping = {
        "PERSON": "PERSON",
        "ORG": "ORG",
        "GPE": "LOCATION",
        "LOC": "LOCATION",
        "FAC": "LOCATION",
        "LOCATION": "LOCATION",
        "DATE": "DATETIME",
        "TIME": "DATETIME",
        "DATETIME": "DATETIME",
        "EVENT": "EVENT",
        "NORP": "NORP",
        "MONEY": "MONEY",
    }

    return mapping.get(label)


# CRF tag-conversion helpers removed — transformer-only output formatting is used below.


def _strip_unsupported_tokenizer_fields(value):
    """Recursively remove fields that are known to break across tokenizers versions."""
    if isinstance(value, dict):
        cleaned = {k: _strip_unsupported_tokenizer_fields(v) for k, v in value.items()}

        # Some tokenizers runtimes reject `split` on Metaspace wrappers.
        if cleaned.get("type") == "Metaspace":
            cleaned.pop("split", None)

        return cleaned

    if isinstance(value, list):
        return [_strip_unsupported_tokenizer_fields(item) for item in value]

    return value


def _load_tokenizer(model_dir: str):
    """Load tokenizer with compatibility fallbacks for tokenizers schema drift."""
    tokenizer_config_path = os.path.join(model_dir, "tokenizer_config.json")

    # Preferred path: let HF resolve tokenizer from local artifacts.
    try:
        return AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
    except Exception as exc:
        logger.warning("AutoTokenizer local load failed: %s", exc)

    tokenizer_path = os.path.join(model_dir, "tokenizer.json")
    if os.path.exists(tokenizer_path):
        try:
            with open(tokenizer_path, "r", encoding="utf-8") as tokenizer_file:
                tokenizer_payload = json.load(tokenizer_file)

            cleaned_payload = _strip_unsupported_tokenizer_fields(tokenizer_payload)

            special_tokens = {}
            if os.path.exists(tokenizer_config_path):
                with open(tokenizer_config_path, "r", encoding="utf-8") as cfg_file:
                    tokenizer_cfg = json.load(cfg_file)
                for key in (
                    "bos_token",
                    "eos_token",
                    "unk_token",
                    "sep_token",
                    "cls_token",
                    "pad_token",
                    "mask_token",
                ):
                    if key in tokenizer_cfg:
                        special_tokens[key] = tokenizer_cfg[key]

            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as tmp:
                json.dump(cleaned_payload, tmp, ensure_ascii=False)
                sanitized_tokenizer_path = tmp.name

            try:
                return PreTrainedTokenizerFast(tokenizer_file=sanitized_tokenizer_path, **special_tokens)
            finally:
                try:
                    os.remove(sanitized_tokenizer_path)
                except OSError:
                    logger.warning("Could not remove temporary tokenizer file: %s", sanitized_tokenizer_path)
        except Exception as exc:
            logger.warning("Sanitized tokenizer load failed: %s", exc)

    # Last resort: use base tokenizer and pair with fine-tuned token-classification head.
    logger.warning("Falling back to base tokenizer: xlm-roberta-base")
    return AutoTokenizer.from_pretrained("xlm-roberta-base")


def load_model():
    """Load transformer checkpoint only; fail if not present."""
    global nlp_pipeline, model_backend, model_name

    logger.info("Initializing transformer NER model loader...")

    if _has_complete_transformer_checkpoint(TRANSFORMER_MODEL_DIR):
        try:
            tokenizer = _load_tokenizer(TRANSFORMER_MODEL_DIR)
            model = AutoModelForTokenClassification.from_pretrained(TRANSFORMER_MODEL_DIR)
            nlp_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="first")
            model_backend = "transformer"
            model_name = os.path.basename(os.path.normpath(TRANSFORMER_MODEL_DIR)) or "transformer_checkpoint"
            logger.info("Loaded transformer checkpoint from %s", TRANSFORMER_MODEL_DIR)
            return
        except Exception as exc:
            logger.exception("Failed to load transformer checkpoint: %s", exc)
            raise RuntimeError(
                f"Transformer checkpoint at {TRANSFORMER_MODEL_DIR} failed to load: {exc}"
            ) from exc

    raise RuntimeError(f"Transformer checkpoint not found or failed to load at {TRANSFORMER_MODEL_DIR}")


def log_prediction(text, entities, status="success", error=None):
    """Logs inference payloads locally in JSONL format."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "text": text,
        "predicted_entities": entities,
        "status": status,
        "error": error,
    }
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as exc:
        logger.error("Failed to write to log file: %s", exc)


def predict_with_transformer(text: str) -> List[Dict[str, object]]:
    ner_results = nlp_pipeline(text)
    formatted_results: List[Dict[str, object]] = []

    for entity in ner_results:
        raw_type = entity.get("entity_group") or entity.get("entity") or ""
        entity_type = _normalize_entity_type(str(raw_type))
        if not entity_type:
            continue

        formatted_results.append(
            {
                "entity_type": entity_type,
                "label": entity_type,
                "confidence": float(entity.get("score", 0.0)),
                "text": entity.get("word", ""),
                "start": int(entity.get("start", 0)),
                "end": int(entity.get("end", 0)),
            }
        )

    return formatted_results


def predict_entities(text: str) -> List[Dict[str, object]]:
    if model_backend == "transformer" and nlp_pipeline is not None:
        return predict_with_transformer(text)

    raise RuntimeError("Transformer model not loaded.")


load_model()


@app.route("/api/predict", methods=["POST"])
def predict():
    """POST endpoint for Named Entity Recognition inference."""
    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field in JSON payload"}), 400

    text = data["text"]

    try:
        formatted_results = predict_entities(text)
        log_prediction(text, formatted_results)
        return (
            jsonify(
                {
                    "status": "success",
                    "model": model_name,
                    "backend": model_backend,
                    "language": "hil",
                    "entities": formatted_results,
                }
            ),
            200,
        )
    except Exception as exc:
        logger.error("Inference error: %s", exc)
        log_prediction(text, [], status="failed", error=str(exc))
        return (
            jsonify(
                {
                    "status": "error",
                    "error": "An error occurred during inference",
                    "details": str(exc),
                }
            ),
            500,
        )


@app.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint."""
    return (
        jsonify(
            {
                "status": "healthy",
                "model_loaded": model_backend is not None,
                "backend": model_backend,
                "model": model_name,
            }
        ),
        200,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)