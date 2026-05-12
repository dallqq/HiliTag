import sklearn_crfsuite

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

if __name__ == "__main__":
    # Mock data formatted similarly to parsed CoNLL
    sample_sent = [
        ("Si", "O"),
        ("Mayor", "O"),
        ("Jerry", "B-PERSON"),
        ("Treñas", "E-PERSON"),
        ("nag-kadto", "O"),
        ("sa", "O"),
        ("Iloilo", "B-GPE"),
        ("City", "E-GPE"),
        (".", "O")
    ]
    
    print("Testing Feature Extraction on sample sequence...")
    features = sent2features(sample_sent)
    labels = sent2labels(sample_sent)
    
    print(f"\nExtracted Feature Dictionary for the token 'Jerry' ({labels[2]}):")
    for feature_name, feature_val in features[2].items():
        print(f"  {feature_name}: {feature_val}")
        
    print("\nInitializing CRF Baseline Model Architecture...")
    crf_model = build_crf_model()
    
    print(f"Algorithm: {crf_model.algorithm}")
    print(f"Transitions parameter configured: {crf_model.all_possible_transitions}")
    print("CRF Baseline successfully built and ready for training!")