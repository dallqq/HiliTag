import os
from typing import List, Dict, Tuple
from transformers import AutoConfig, AutoModelForTokenClassification, AutoTokenizer

def create_label_mappings(labels: List[str]) -> Tuple[Dict[str, int], Dict[int, str]]:
    """
    Creates dynamic ID-to-Label and Label-to-ID mappings required by
    Hugging Face for token classification tasks.
    """
    label2id = {label: i for i, label in enumerate(labels)}
    id2label = {i: label for i, label in enumerate(labels)}
    return label2id, id2label

def initialize_xlmr_model(labels: List[str], model_name: str = "xlm-roberta-base"):
    """
    Initializes the XLM-RoBERTa model suite for Token Classification.
    
    Context: xlm-roberta-base is chosen for its robust multilingual SentencePiece 
    vocabulary, which makes it effective at handling low-resource Philippine 
    languages like Hiligaynon.
    """
    label2id, id2label = create_label_mappings(labels)
    
    # 1. Initialize configuration with dynamic label mappings
    config = AutoConfig.from_pretrained(
        model_name,
        num_labels=len(labels),
        id2label=id2label,
        label2id=label2id
    )
    
    # 2. Load the Token Classification architecture
    # ignore_mismatched_sizes is helpful if we load a pre-trained head but have custom OntoNotes labels
    model = AutoModelForTokenClassification.from_pretrained(
        model_name, 
        config=config,
        ignore_mismatched_sizes=True
    )
    
    # 3. Initialize the corresponding tokenizer (SentencePiece based)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    return model, tokenizer, config

if __name__ == "__main__":
    # Mock label list to demonstrate initialization (OntoNotes 5.0 standard mapped to BIOES)
    # Ideally, this list is dynamically extracted from your .conll training file
    mock_labels = [
        "O", 
        "B-PERSON", "I-PERSON", "E-PERSON", "S-PERSON",
        "B-GPE",    "I-GPE",    "E-GPE",    "S-GPE",
        "B-ORG",    "I-ORG",    "E-ORG",    "S-ORG",
        "B-DATE",   "I-DATE",   "E-DATE",   "S-DATE"
    ]
    
    print(f"Loading {len(mock_labels)} labels into XLM-R Configuration...")
    model, tokenizer, config = initialize_xlmr_model(mock_labels)
    
    print("\nModel Architecture Initialization Successful!")
    print(f"Base Model: xlm-roberta-base")
    print(f"Total Parameters: {model.num_parameters():,}")
    print(f"ID to Label Mapping Sample: {config.id2label}")
