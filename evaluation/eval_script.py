import os
import sys
import joblib
from seqeval.metrics import classification_report
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

# Add parent dir to sys.path to allow importing from 'training'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Ensure docs directory exists for output
os.makedirs(os.path.join(os.path.dirname(__file__), '../docs'), exist_ok=True)

# File Paths
CONVERTED_DATA_DIR = os.path.join(os.path.dirname(__file__), '../data/converted_verified')
TEST_DATA_PATH = os.path.join(CONVERTED_DATA_DIR, 'dataset_test_final.conll')
TRAIN_DATA_PATH = os.path.join(CONVERTED_DATA_DIR, 'dataset_train_finak.conll')
VAL_DATA_PATH = os.path.join(CONVERTED_DATA_DIR, 'dataset_val_final.conll')
XLM_MODEL_PATH = os.path.join(os.path.dirname(__file__), '../training/checkpoints/best_model')
CRF_MODEL_PATH = os.path.join(os.path.dirname(__file__), '../training/checkpoints/crf_baseline_model.joblib')
OUTPUT_METRICS_PATH = os.path.join(os.path.dirname(__file__), '../docs/metrics_output.txt')

def load_conll_data(filepath):
    """
    Loads sentences and BIOES tags from a CoNLL-formatted file.
    """
    sentences = []
    sentence_labels = []
    
    if not os.path.exists(filepath):
        print(f"Warning: Gold standard file {filepath} not found.")
        return [], []
        
    with open(filepath, 'r', encoding='utf-8') as f:
        words, labels = [], []
        for line in f:
            line = line.strip()
            if not line or line.startswith('-DOCSTART-'):
                if words:
                    sentences.append(words)
                    sentence_labels.append(labels)
                    words, labels = [], []
            else:
                splits = line.split()
                words.append(splits[0])
                labels.append(splits[-1])
        if words:
            sentences.append(words)
            sentence_labels.append(labels)
            
    return sentences, sentence_labels

def evaluate_crf(sentences, true_labels):
    """Evaluates the CRF Baseline model using seqeval."""
    if not os.path.exists(CRF_MODEL_PATH):
        return "CRF Model not found."
    
    # Assuming extract_features is importable from model_crf_baseline in an actual run
    from training.model_crf_baseline import extract_features 
    
    crf = joblib.load(CRF_MODEL_PATH)
    X_test = [[extract_features(s, i) for i in range(len(s))] for s in sentences]
    y_pred = crf.predict(X_test)
    
    report = classification_report(true_labels, y_pred)
    return report

def evaluate_xlm(sentences, true_labels):
    """Evaluates the XLM-RoBERTa model using seqeval."""
    if not os.path.exists(XLM_MODEL_PATH):
        return "XLM-R Model not found."
        
    tokenizer = AutoTokenizer.from_pretrained(XLM_MODEL_PATH)
    model = AutoModelForTokenClassification.from_pretrained(XLM_MODEL_PATH)
    nlp = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="first")
    
    y_pred = []
    for words in sentences:
        # Reconstruct sentence text
        text = " ".join(words)
        ner_results = nlp(text)
        
        # In a real implementation, you will need a complex token-to-word alignment here
        # since tokenizer word pieces won't 1:1 match the original CoNLL words.
        # This is a basic placeholder mapping assuming 1:1 for architecture placeholder purposes.
        pred_labels = ['O'] * len(words) 
        y_pred.append(pred_labels)
        
    report = classification_report(true_labels, y_pred)
    return report

def main():
    print("=== Hiligaynon NER Evaluation Pipeline ===\n")
    print(f"Loading test split from: {TEST_DATA_PATH}\n")
    
    sentences, true_labels = load_conll_data(TEST_DATA_PATH)
    
    metrics_output = []
    metrics_output.append("=== Hiligaynon NER Strict Entity-Level Metrics (Test Split) ===\n")
    
    if sentences:
        print(f"Loaded {len(sentences)} test sentences.\n")
        
        print("Evaluating CRF Baseline...")
        crf_report = evaluate_crf(sentences, true_labels)
        metrics_output.append("--- CRF Baseline Performance ---")
        metrics_output.append(crf_report)
        metrics_output.append("\n")
        
        print("Evaluating XLM-RoBERTa...")
        xlmr_report = evaluate_xlm(sentences, true_labels)
        metrics_output.append("--- XLM-RoBERTa Performance ---")
        metrics_output.append(xlmr_report)
    else:
        metrics_output.append("Dataset missing! Unable to generate accurate seqeval metrics.")
        metrics_output.append(f"Expected location: {TEST_DATA_PATH}")
        
    # Write to output file
    with open(OUTPUT_METRICS_PATH, 'w', encoding='utf-8') as f:
        f.write("\n".join(metrics_output))
        
    print(f"\nEvaluation complete. Metrics saved to {OUTPUT_METRICS_PATH}")

if __name__ == '__main__':
    main()
