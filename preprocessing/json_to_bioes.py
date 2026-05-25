import os
import sys
import json
import glob
from typing import List, Dict, Any, Tuple

# Ensure python path includes the current directory so we can import the tokenizer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from preprocessing.tokenizer import get_hiligaynon_nlp

def align_tokens_to_bioes(text: str, entities: List[Dict[str, Any]], nlp) -> List[List[Tuple[str, str]]]:
    """
    Aligns Label Studio character-level offsets to token-level BIOES tags.
    Returns a list of sentences, where each sentence is a list of (token_text, tag) tuples.
    """
    doc = nlp(text)
    
    # Initialize all tokens with 'O' (Outside) by default
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
        # Safely extract the primary label (ignores secondary labels if annotator selected multiple)
        label = ent['labels'][0] if isinstance(ent['labels'], list) else ent['labels']
        
        # Tolerant boundary matching (Intersection):
        # Includes the token if it overlaps with the annotation boundary.
        # This prevents missing tokens if a human annotator missed the first/last character.
        ent_tokens = [
            t for t in doc 
            if max(t.idx, ent['start']) < min(t.idx + len(t.text), ent['end'])
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
                
    # Group tokens by sentences if the NLP pipeline supports sentence boundaries.
    # Otherwise, treat the entire document as a single sentence block.
    conll_sentences = []
    if doc.has_annotation("SENT_START"):
        for sent in doc.sents:
            conll_sentences.append([(token.text, tags[token.i]) for token in sent])
    else:
        conll_sentences.append([(token.text, tags[token.i]) for token in doc])
        
    return conll_sentences

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
            
            # Filter out tasks that the annotator explicitly skipped/cancelled
            valid_annotations = [ann for ann in annotations if not ann.get('was_cancelled', False)]
            
            if not valid_annotations:
                continue
                
            # Assume the first valid annotation holds the final result
            result = valid_annotations[0].get('result', [])
            
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
            
            # Align token offsets (returns list of sentences)
            bioes_sentences = align_tokens_to_bioes(text, entities, nlp)
            
            # Write CONLL output
            for sentence in bioes_sentences:
                for token, tag in sentence:
                    f.write(f"{token}\t{tag}\n")
                f.write("\n")  # Empty line separates sentences/documents


def process_verified_folder(verified_dir: str, out_dir: str, nlp):
    """
    Processes all Label Studio JSON files in `verified_dir` and writes
    CoNLL outputs to `out_dir` (one .conll per input JSON file).
    """
    os.makedirs(out_dir, exist_ok=True)

    json_paths = glob.glob(os.path.join(verified_dir, "*.json"))
    if not json_paths:
        print(f"No JSON files found in verified folder: {verified_dir}")
        return

    for path in json_paths:
        try:
            with open(path, 'r', encoding='utf-8') as rf:
                data = json.load(rf)

            base = os.path.splitext(os.path.basename(path))[0]
            out_file = os.path.join(out_dir, base + '.conll')
            convert_label_studio_to_conll(data, out_file, nlp)
            print(f"Converted {path} -> {out_file}")
        except Exception as e:
            print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    # Initialize the tokenizer
    nlp = get_hiligaynon_nlp()
    
    # Optional: Add a simple sentencizer if your texts contain multiple sentences per task.
    # This ensures models with max-token limits (e.g., 512) aren't overwhelmed by long paragraphs.
    if "sentencizer" not in nlp.pipe_names:
        nlp.add_pipe("sentencizer")
    
    # Mock data to demonstrate the alignment
    sample_data = [
        {
            "data": {"text": "Si Mayor Jerry Treñas nag-kadto sa Iloilo City."},
            "annotations": [{
                "was_cancelled": False,
                "result": [
                    {"type": "labels", "value": {"start": 9, "end": 21, "labels": ["PERSON"]}},                ]
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

    # If a verified split folder exists, process all Label Studio JSONs there
    verified_dir = os.path.join(project_root, 'data', 'splits', 'verified')
    out_converted = os.path.join(data_dir, 'converted_verified')
    
    if os.path.isdir(verified_dir):
        process_verified_folder(verified_dir, out_converted, nlp)
    else:
        print(f"Verified folder not found at: {verified_dir}")