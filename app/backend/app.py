import os
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

app = Flask(__name__)
# Enable CORS for Next.js frontend communication
CORS(app)

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# File Paths
MODEL_PATH = os.environ.get('MODEL_PATH', os.path.join(os.path.dirname(__file__), '../../training/checkpoints/best_model'))
LOG_FILE = os.path.join(os.path.dirname(__file__), 'predictions_log.jsonl')

# Global variable to hold the NLP pipeline
nlp_pipeline = None

def load_model():
    """Pre-loads the XLM-RoBERTa model upon server boot to minimize request latency."""
    global nlp_pipeline
    logger.info("Initializing NLP model...")
    try:
        if os.path.exists(MODEL_PATH):
            tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
            model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
            nlp_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="first")
            logger.info("Model loaded successfully.")
        else:
            logger.warning(f"Warning: Model directory {MODEL_PATH} not found. Running in mock/fallback mode.")
            # For demonstration if model is not yet trained
            nlp_pipeline = None
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        nlp_pipeline = None

# Initialize the model at startup
load_model()

def log_prediction(text, entities, status="success", error=None):
    """Logs the inference payload locally in JSONL format."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "text": text,
        "predicted_entities": entities,
        "status": status,
        "error": error
    }
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry) + '\n')
    except Exception as e:
        logger.error(f"Failed to write to log file: {str(e)}")

@app.route('/api/predict', methods=['POST'])
def predict():
    """
    POST endpoint for Named Entity Recognition inference.
    Expects JSON: {"text": "String of Hiligaynon text"}
    """
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' field in JSON payload"}), 400
        
    text = data['text']
    
    # Try/except block to ensure API stability on unpredictable inputs
    try:
        if nlp_pipeline:
            ner_results = nlp_pipeline(text)
            
            # Convert float32 scores to float for proper JSON serialization
            formatted_results = []
            for entity in ner_results:
                e_type = entity.get("entity_group", "ORG")
                formatted_results.append({
                    "entity_type": e_type,
                    "label": e_type,
                    "confidence": float(entity.get("score", 0.0)),
                    "text": entity.get("word", ""),
                    "start": int(entity.get("start", 0)),
                    "end": int(entity.get("end", 0))
                })
        else:
            # Fallback/Mock response if model is MIA
            formatted_results = [
                {"entity_type": "ORG", "label": "ORG", "text": "Mock-Org", "start": 0, "end": 8, "confidence": 0.99}
            ]
            
        log_prediction(text, formatted_results)
        return jsonify({
            "status": "success",
            "model": "xlm-roberta-base",
            "language": "hil",
            "entities": formatted_results
        }), 200
        
    except Exception as e:
        logger.error(f"Inference error: {str(e)}")
        log_prediction(text, [], status="failed", error=str(e))
        return jsonify({"status": "error", "error": "An error occurred during inference", "details": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "healthy", "model_loaded": nlp_pipeline is not None}), 200

if __name__ == '__main__':
    # Run the server (default port 5000)
    app.run(host='0.0.0.0', port=5000, debug=True)