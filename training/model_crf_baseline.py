import os
import joblib
import sklearn_crfsuite
from sklearn_crfsuite import metrics

def word2features(sent, i):
    """
    Extracts handcrafted lexical and orthographic features for a given word in a sequence.
    This traditional feature engineering approach is key for building the CRF baseline.
    """
    word = sent[i][0]
    
    # Core word-level features
    features = {
        'bias': 1.0,
        'word.lower()': word.lower(),
        'word.isupper()': word.isupper(),
        'word.istitle()': word.istitle(),
        'word.isdigit()': word.isdigit(),
        
        # Suffix and Prefix extraction captures important structural morphological queues
        'word[-3:]': word[-3:],
        'word[-2:]': word[-2:],
        'word[:2]': word[:2],
        'word[:3]': word[:3],
        
        # Basic word shape approximation based on length
        'word.length': len(word),
        'word.has_hyphen': '-' in word,  # Especially important for Hiligaynon affixes
    }
    
    # Contextual features: Previous word
    if i > 0:
        word_prev = sent[i-1][0]
        features.update({
            '-1:word.lower()': word_prev.lower(),
            '-1:word.istitle()': word_prev.istitle(),
            '-1:word.isupper()': word_prev.isupper(),
        })
    else:
        features['BOS'] = True  # Beginning of Sequence
        
    # Contextual features: Next word
    if i < len(sent) - 1:
        word_next = sent[i+1][0]
        features.update({
            '+1:word.lower()': word_next.lower(),
            '+1:word.istitle()': word_next.istitle(),
            '+1:word.isupper()': word_next.isupper(),
        })
    else:
        features['EOS'] = True  # End of Sequence
        
    return features

def sent2features(sent):
    """Converts a whole sentence sequence into a sequence of feature dictionaries."""
    return [word2features(sent, i) for i in range(len(sent))]

def sent2labels(sent):
    """Extracts sequence labels from a tuple array."""
    return [label for token, label in sent]

def sent2tokens(sent):
    """Extracts sequence tokens from a tuple array."""
    return [token for token, label in sent]

def build_crf_model():
    """
    Initializes the Conditional Random Field (CRF) model using sklearn-crfsuite.
    Purpose: Establish a classical sequence tagging baseline to contextualize and
    prove the computational effectiveness of the XLM-R architecture.
    """
    crf = sklearn_crfsuite.CRF(
        algorithm='lbfgs',
        c1=0.1,  # L1 regularization coefficient
        c2=0.1,  # L2 regularization coefficient
        max_iterations=100,
        all_possible_transitions=True,
        verbose=False
    )
    return crf

def load_conll_data(file_path):
    """Loads CoNLL format into lists of sentence tuples: [[(token1, tag1), (token2, tag2), ...], ...]"""
    if not os.path.exists(file_path):
        print(f"Warning: File not found: {file_path}")
        return []
        
    sentences = []
    current_sent = []
    
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("-DOCSTART-") or line == "" or line == "\n":
                if current_sent:
                    sentences.append(current_sent)
                    current_sent = []
            else:
                splits = line.strip().split("\t")
                if len(splits) >= 2:
                    current_sent.append((splits[0], splits[1]))
        if current_sent:
            sentences.append(current_sent)
            
    return sentences

if __name__ == "__main__":
    print("--- CRF Baseline Training Pipeline ---")
    
    # 1. Load Data
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_file = os.path.join(project_root, 'data', 'final_train.conll')
    test_file = os.path.join(project_root, 'data', 'final_test_gold.conll')
    
    train_sents = load_conll_data(train_file)
    test_sents = load_conll_data(test_file)
    
    if not train_sents:
        print(f"Please ensure your {train_file} is populated before training.")
        exit()
        
    print(f"Loaded {len(train_sents)} training sentences.")
    print(f"Loaded {len(test_sents)} testing sentences.")
    
    # 2. Extract Features
    print("\nExtracting handcrafted features...")
    X_train = [sent2features(s) for s in train_sents]
    y_train = [sent2labels(s) for s in train_sents]
    
    X_test = [sent2features(s) for s in test_sents]
    y_test = [sent2labels(s) for s in test_sents]
    
    # 3. Train Model
    print("\nInitializing and training CRF model (L-BFGS optimization)...")
    crf_model = build_crf_model()
    crf_model.verbose = True # Turn on verbosity for training logs
    crf_model.fit(X_train, y_train)
    
    # 4. Evaluation
    if X_test:
        print("\nEvaluating on Gold Standard Test Set...")
        y_pred = crf_model.predict(X_test)
        
        # Remove 'O' tags from metrics to get true NER performance
        labels = list(crf_model.classes_)
        if 'O' in labels:
            labels.remove('O')
            
        f1 = metrics.flat_f1_score(y_test, y_pred, average='weighted', labels=labels)
        print(f"CRF Baseline F1-Score (Weighted excluding 'O'): {f1:.4f}")
        
        print("\nDetailed Classification Report:")
        print(metrics.flat_classification_report(y_test, y_pred, labels=labels, digits=3))
        
    # 5. Save Model Context
    checkpoints_dir = os.path.join(project_root, 'training', 'checkpoints')
    os.makedirs(checkpoints_dir, exist_ok=True)
    save_path = os.path.join(checkpoints_dir, 'crf_baseline_model.joblib')
    
    joblib.dump(crf_model, save_path)
    print(f"\nTraining Complete. Model saved to: {save_path}")