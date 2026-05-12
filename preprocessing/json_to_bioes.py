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
    """
    doc = nlp(text)
    tokens_bioes = []
    
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

    for token in doc:
        token_start = token.idx
        token_end = token_start + len(token.text)
        
        # Search if this token falls within any valid entity boundary
        matched_ent = None
        for ent in valid_entities:
            # Token falls completely inside the entity offset
            if token_start >= ent['start'] and token_end <= ent['end']:
                matched_ent = ent
                break
            # Token partially overlaps (malformed or misaligned tokenizer vs annotation)
            elif token_start < ent['end'] and token_end > ent['start']:
                # Discard conflicting partial bounds gracefully
                break
        
        if not matched_ent:
            tokens_bioes.append((token.text, "O"))
            continue
            
        # Safely extract the label
        label = matched_ent['labels'][0] if isinstance(matched_ent['labels'], list) else matched_ent['labels']
        
        # Determine strict BIOES sequence positions
        ent_tokens = [t for t in doc if t.idx >= matched_ent['start'] and (t.idx + len(t.text)) <= matched_ent['end']]
        
        if not ent_tokens:
            tokens_bioes.append((token.text, "O"))
            continue
            
        if len(ent_tokens) == 1:
            tag = f"S-{label}"
        elif token.i == ent_tokens[0].i:
            tag = f"B-{label}"
        elif token.i == ent_tokens[-1].i:
            tag = f"E-{label}"
        else:
            tag = f"I-{label}"
            
        tokens_bioes.append((token.text, tag))
        
    return tokens_bioes

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
    
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_file = os.path.join(project_root, 'data', 'final_train.conll')
    test_file = os.path.join(project_root, 'data', 'final_test_gold.conll')
    
    # This acts as our initialization for the empty datasets/generation files
    convert_label_studio_to_conll(sample_data, train_file, nlp)
    
    # Write a clean, empty placeholder for the test gold standard 
    if not os.path.exists(test_file):
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write("")
            
    print(f"Alignment algorithm compiled.")
    print(f"CoNLL dataset outputs prepared at:\n- {train_file}\n- {test_file}")
