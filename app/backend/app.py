from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import logging

load_dotenv()

app = Flask(__name__)
# Allow CORS for Next.js frontend
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Local Logging Setup
LOG_FILE = "predictions_log.jsonl"
logger.info(f"Predictions will be logged locally to {LOG_FILE}")


# Initialize Model and Tokenizer (Placeholder for the actual trained model)
# For the backend shell, we'll try to load xlm-roberta-base or a specific model path.
MODEL_PATH = os.environ.get("MODEL_PATH", "xlm-roberta-base")
logger.info(f"Loading model from {MODEL_PATH}...")

try:
    # In production, this would point to your finetuned model directory
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
    nlp_ner = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Error loading model: {e}")
    nlp_ner = None

@app.route('/api/predict', methods=['POST'])
def predict():
    if not nlp_ner:
         return jsonify({"error": "NER model is not initialized."}), 500

    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No 'text' field provided in request body."}), 400

    text = data['text']

    try:
        # 1. Perform inference
        predictions = nlp_ner(text)
        
        # 2. Convert predictions to a standard, serializable JSON format
        formatted_predictions = []
        for pred in predictions:
            formatted_predictions.append({
                "entity_group": pred.get("entity_group", pred.get("entity", "")),
                "score": float(pred.get("score", 0)),
                "word": pred.get("word", ""),
                "start": pred.get("start", 0),
                "end": pred.get("end", 0)
            })

        # 3. Log query and prediction locally
        try:
            log_entry = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "input_string": text,
                "model_predictions": formatted_predictions
            }
            with open(LOG_FILE, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            logger.error(f"Failed to log data locally: {e}")

        # 4. Return to client
        return jsonify({
            "text": text,
            "entities": formatted_predictions
        }), 200

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({"error": "Failed to process text."}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy", 
        "model_loaded": nlp_ner is not None,
        "local_logging": True
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
