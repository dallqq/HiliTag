import os
import sys
import json
from typing import List, Dict, Any, Tuple

# Ensure python path includes the current directory so we can import the tokenizer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from preprocessing.tokenizer import get_hiligaynon_nlp

def align_tokens_to_bioes(text: str, entities: List[Dict[str, Any]], nlp) -> List[Tuple[str, str]]:
    """
    Aligns Label Studio character-level offsets to token-level BIOES tags.
    Assumes `nlp` returns an object with tokens containing `.text`, `.idx`, and `.i`.
    """
    doc = nlp(text)
    
    # Initialize all tokens with 'O' (Outside) by default
    # This prevents the need to continuously append to a list inside loops
    tags = ["O"] * len(doc)
    
    # Sort entities by start offset to process sequentially
    entities = sorted(entities, key=lambda x: x['start'])
    
    # Filter and validate to gracefully discard overlapping/conflicting entities
    valid_entities = []
    last_end = -1
    for ent in entities:
        if ent['start'] >= last_end:
            valid_entities.append(ent)
            last_end = ent['end']
        else:
            print(f"Warning: Discarding conflicting overlapping entity bounds starting at {ent['start']}")

    for ent in valid_entities:
        # Safely extract the label
        label = ent['labels'][0] if isinstance(ent['labels'], list) else ent['labels']
        
        # Find tokens that fall within the entity boundary.
        # Note: Depending on tokenizer strictness, you may want to loosen these bounds
        # if annotators accidentally include leading/trailing spaces in Label Studio.
        ent_tokens = [
            t for t in doc 
            if t.idx >= ent['start'] and (t.idx + len(t.text)) <= ent['end']
        ]
        
        if not ent_tokens:
            continue
            
        # Apply BIOES tagging strictly to the indices found
        if len(ent_tokens) == 1:
            tags[ent_tokens[0].i] = f"S-{label}"
        else:
            tags[ent_tokens[0].i] = f"B-{label}"
            tags[ent_tokens[-1].i] = f"E-{label}"
            # Tag all intermediate tokens as 'Inside'
            for t in ent_tokens[1:-1]:
                tags[t.i] = f"I-{label}"
                
    # Combine the token text with the calculated tags
    return [(token.text, tags[token.i]) for token in doc]

def convert_label_studio_to_conll(json_data: List[Dict], output_file: str, nlp):
    """
    Parses Label Studio JSON exports and translates them into CONLL format
    using token-level BIOES tagging.
    """
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in json_data:
            text = item.get('data', {}).get('text', '')
            annotations = item.get('annotations', [])
            
            if not annotations:
                continue
                
            result = annotations[0].get('result', [])
            
            entities = []
            for res in result:
                if res.get('type') == 'labels':
                    val = res.get('value', {})
                    if 'start' in val and 'end' in val and 'labels' in val:
                        entities.append({
                            'start': val['start'],
                            'end': val['end'],
                            'labels': val['labels']
                        })
            
            # Align token offsets
            bioes_tokens = align_tokens_to_bioes(text, entities, nlp)
            
            # Write CONLL output
            for token, tag in bioes_tokens:
                f.write(f"{token}\t{tag}\n")
            f.write("\n") # Sentence separator

if __name__ == "__main__":
    nlp = get_hiligaynon_nlp()
    
    # Mock data to demonstrate the alignment
    sample_data = [
        {
            "data": {"text": "Si Mayor Jerry Treñas nag-kadto sa Iloilo City."},
            "annotations": [{
                "result": [
                    {"type": "labels", "value": {"start": 9, "end": 21, "labels": ["PERSON"]}},
                    {"type": "labels", "value": {"start": 35, "end": 46, "labels": ["GPE"]}}
                ]
            }]
        }
    ]
    
    # Handle the directory safely based on the script's actual execution path
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(project_root, 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    train_file = os.path.join(data_dir, 'final_train.conll')
    test_file = os.path.join(data_dir, 'final_test_gold.conll')
    
    # This acts as our initialization for the empty datasets/generation files
    convert_label_studio_to_conll(sample_data, train_file, nlp)
    
    # Write a clean, empty placeholder for the test gold standard 
    if not os.path.exists(test_file):
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write("")
            
    print("Alignment algorithm compiled.")
    print(f"CoNLL dataset outputs prepared at:\n- {train_file}\n- {test_file}")