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
        'word.has_hyphen': '-' in word,
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
    print("--- CRF Baseline Training & Tuning Pipeline ---")
    
    # 1. Load Data
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_file = os.path.join(project_root, 'data', 'converted_verified', 'dataset_train_final.conll')
    val_file = os.path.join(project_root, 'data', 'converted_verified', 'dataset_val_final.conll')
    test_file = os.path.join(project_root, 'data', 'converted_verified', 'dataset_test_final.conll')
    
    train_sents = load_conll_data(train_file)
    val_sents = load_conll_data(val_file)
    test_sents = load_conll_data(test_file)
    
    if not train_sents or not val_sents or not test_sents:
        print("Error: Ensure train, validation, and test datasets are populated.")
        exit()
        
    print(f"Loaded {len(train_sents)} training sentences.")
    print(f"Loaded {len(val_sents)} validation sentences.")
    print(f"Loaded {len(test_sents)} testing sentences.")
    
    # 2. Extract Features
    print("\nExtracting handcrafted features for all splits...")
    X_train = [sent2features(s) for s in train_sents]
    y_train = [sent2labels(s) for s in train_sents]
    
    X_val = [sent2features(s) for s in val_sents]
    y_val = [sent2labels(s) for s in val_sents]
    
    X_test = [sent2features(s) for s in test_sents]
    y_test = [sent2labels(s) for s in test_sents]
    
    # 3. Hyperparameter Tuning using Validation Set
    print("\nStarting Hyperparameter Tuning on Validation Set...")
    
    # Grid of L1 and L2 regularization parameters to test
    c1_values = [0.01, 0.1, 1.0]
    c2_values = [0.01, 0.1, 1.0]
    
    best_val_f1 = 0.0
    best_model = None
    best_params = {}
    
    # Extract unique labels across the training set to exclude 'O' from metrics
    all_train_labels = set(label for doc in y_train for label in doc)
    eval_labels = list(all_train_labels)
    if 'O' in eval_labels:
        eval_labels.remove('O')
    
    for c1 in c1_values:
        for c2 in c2_values:
            print(f"  Training CRF with c1={c1}, c2={c2}...")
            
            crf = sklearn_crfsuite.CRF(
                algorithm='lbfgs',
                c1=c1,
                c2=c2,
                max_iterations=100,
                all_possible_transitions=True,
                verbose=False
            )
            
            # Train on 80% Train
            crf.fit(X_train, y_train)
            
            # Evaluate on 10% Validation
            y_val_pred = crf.predict(X_val)
            val_f1 = metrics.flat_f1_score(y_val, y_val_pred, average='weighted', labels=eval_labels)
            
            print(f"    Validation F1: {val_f1:.4f}")
            
            if val_f1 > best_val_f1:
                best_val_f1 = val_f1
                best_model = crf
                best_params = {'c1': c1, 'c2': c2}
                
    print(f"\nOptimal Hyperparameters Selected: {best_params} (Validation F1: {best_val_f1:.4f})")
    
    # 4. Final Evaluation on Isolated Test Set
    print("\n--- Final Evaluation on Unseen Test Set ---")
    y_test_pred = best_model.predict(X_test)
    
    final_test_f1 = metrics.flat_f1_score(y_test, y_test_pred, average='weighted', labels=eval_labels)
    print(f"Champion CRF Final Test F1-Score (Weighted excluding 'O'): {final_test_f1:.4f}")
    
    print("\nDetailed Classification Report (Test Set):")
    print(metrics.flat_classification_report(y_test, y_test_pred, labels=eval_labels, digits=3))
    
    # 5. Save Champion Model
    checkpoints_dir = os.path.join(project_root, 'training', 'checkpoints')
    os.makedirs(checkpoints_dir, exist_ok=True)
    save_path = os.path.join(checkpoints_dir, 'crf_baseline_model.joblib')
    
    joblib.dump(best_model, save_path)
    print(f"\nPipeline Complete. Champion model saved to: {save_path}")