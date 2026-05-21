import os
import sys
import json
import tempfile
import joblib
import torch
from tqdm import tqdm
from seqeval.metrics import classification_report
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification, PreTrainedTokenizerFast

# Add parent dir to sys.path to allow importing from 'training'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from training.model_crf_baseline import sent2features

# Ensure docs directory exists for output
os.makedirs(os.path.join(os.path.dirname(__file__), '../docs'), exist_ok=True)

# File Paths
CONVERTED_DATA_DIR = os.path.join(os.path.dirname(__file__), '../data/converted_verified')
TEST_DATA_PATH = os.path.join(CONVERTED_DATA_DIR, 'dataset_test_final.conll')
TRAIN_DATA_PATH = os.path.join(CONVERTED_DATA_DIR, 'dataset_train_final.conll')
VAL_DATA_PATH = os.path.join(CONVERTED_DATA_DIR, 'dataset_val_final.conll')
XLM_MODEL_PATH = os.path.join(os.path.dirname(__file__), '../training/checkpoints/best_model')
CRF_MODEL_PATH = os.path.join(os.path.dirname(__file__), '../training/checkpoints/crf_baseline_model.joblib')
OUTPUT_METRICS_PATH = os.path.join(os.path.dirname(__file__), '../docs/metrics_output.txt')

# Allowed entities updated according to your requirements
VALID_ENTITIES = {"PERSON", "ORG", "LOCATION", "DATETIME", "MONEY", "EVENT", "NORP"}


def _strip_unsupported_tokenizer_fields(value):
    """Recursively remove known cross-version tokenizer fields that can break loading."""
    if isinstance(value, dict):
        cleaned = {k: _strip_unsupported_tokenizer_fields(v) for k, v in value.items()}
        if cleaned.get("type") == "Metaspace":
            cleaned.pop("split", None)
        return cleaned

    if isinstance(value, list):
        return [_strip_unsupported_tokenizer_fields(item) for item in value]

    return value


def load_compatible_tokenizer(model_dir):
    """Load tokenizer from checkpoint with fallback for tokenizers schema drift."""
    tokenizer_config_path = os.path.join(model_dir, "tokenizer_config.json")

    try:
        return AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
    except Exception as exc:
        print(f"Warning: AutoTokenizer local load failed: {exc}")

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
                    pass
        except Exception as exc:
            print(f"Warning: Sanitized tokenizer load failed: {exc}")

    print("Warning: Falling back to base tokenizer: xlm-roberta-base")
    return AutoTokenizer.from_pretrained("xlm-roberta-base")

def filter_label(label):
    """
    Ensures that the predicted or actual label is one of the strictly allowed entities.
    Filters out any obsolete or incorrectly predicted entity types by mapping them to 'O'.
    Safely handles BIO/BIOES prefixes (e.g., 'B-PERSON', 'I-ORG').
    """
    if label == 'O' or not label:
        return 'O'
    
    # Extract base entity (handle BIOES prefixes like B-, I-, E-, S-)
    base_entity = label[2:] if (len(label) > 2 and label[1] == '-') else label
    
    if base_entity in VALID_ENTITIES:
        return label
    return 'O'

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
                # Filter gold labels to strictly match your 7 categories
                labels.append(filter_label(splits[-1]))
        if words:
            sentences.append(words)
            sentence_labels.append(labels)
            
    return sentences, sentence_labels

def evaluate_crf(sentences, true_labels):
    """Evaluates the CRF Baseline model using seqeval."""
    if not os.path.exists(CRF_MODEL_PATH):
        return "CRF Model not found."
    
    crf = joblib.load(CRF_MODEL_PATH)
    # sent2features expects sentences where tokens are accessed via sent[i][0]
    X_test = [sent2features([[w] for w in s]) for s in sentences]
    y_pred = crf.predict(X_test)
    
    # Clean predictions to enforce strictly the 7 categories
    y_pred_clean = [[filter_label(lbl) for lbl in sent] for sent in y_pred]
    
    report = classification_report(true_labels, y_pred_clean)
    return report

def evaluate_xlm(sentences, true_labels):
    """Evaluates the XLM-RoBERTa model using seqeval."""
    if not os.path.exists(XLM_MODEL_PATH):
        return "XLM-R Model not found."

    tokenizer = load_compatible_tokenizer(XLM_MODEL_PATH)
    model = AutoModelForTokenClassification.from_pretrained(XLM_MODEL_PATH)
    
    device = 0 if torch.cuda.is_available() else -1
    nlp = pipeline("ner", model=model, tokenizer=tokenizer, device=device)
    
    y_pred = []
    for words in tqdm(sentences, desc="XLM-R Inference Progress"):
        # Reconstruct sentence text
        text = " ".join(words)
        ner_results = nlp(text)
        
        pred_labels = ['O'] * len(words) 
        
        # Calculate character spans for original words to align predicted subwords
        word_spans = []
        curr_pos = 0
        for w in words:
            word_spans.append((curr_pos, curr_pos + len(w)))
            curr_pos += len(w) + 1
            
        for res in ner_results:
            start_char, end_char = res['start'], res['end']
            
            # Extract and filter label against strictly allowed entities
            label = filter_label(res['entity'])
            
            # Map subword character offset back to the original word index
            for w_idx, (w_start, w_end) in enumerate(word_spans):
                if start_char >= w_start and start_char < w_end:
                    # Assign label. Prefer 'B-' or 'S-' tags over 'I-'/'E-' if multiple subwords fall into one word
                    current_label = pred_labels[w_idx]
                    if current_label == 'O' or (current_label.startswith('I-') and label.startswith('B-')):
                        pred_labels[w_idx] = label
                    break
                    
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