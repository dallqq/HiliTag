import json
import os
import torch
from gliner import GLiNER
from tqdm import tqdm

# 18 OntoNotes 5.0 Categories
ONTONOTES_CATEGORIES = [
    "PERSON", "NORP", "FAC", "ORG", "GPE", "LOC", "PRODUCT", "EVENT", 
    "WORK_OF_ART", "LAW", "LANGUAGE", "DATE", "TIME", "PERCENT", 
    "MONEY", "QUANTITY", "ORDINAL", "CARDINAL"
]

def main():
    input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean_sentences.txt')
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dataset_silver_for_labelstudio.json')
    
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        return

    # 1. Detect device for faster processing
    device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Loading GLiNER Multilingual model on {device.upper()}...")
    
    # Load GLiNER Multilingual model
    model_version = "gliner_multi-v2.1"
    model = GLiNER.from_pretrained(f"urchade/{model_version}").to(device)

    # Load raw sentences
    with open(input_path, 'r', encoding='utf-8') as f:
        sentences = [line.strip() for line in f if line.strip()]

    print(f"Starting semantic labeling for {len(sentences)} sentences...")
    
    confidence_threshold = 0.5 
    
    # Open the file once and stream to it incrementally
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("[\n") # Open the JSON array manually
        
        first_entry = True
        
        for i, sentence in enumerate(tqdm(sentences, desc="Predicting Entities")):
            # Predict one sentence at a time
            preds = model.predict_entities(sentence, ONTONOTES_CATEGORIES, threshold=confidence_threshold)
            
            # Format predictions directly into Label Studio format
            ls_results = []
            for ent in preds:
                ls_results.append({
                    "from_name": "label",   # Must match <Labels name="label"> in Label Studio template
                    "to_name": "text",      # Must match <Labels toName="text"> in Label Studio template
                    "type": "labels",
                    "value": {
                        "start": ent["start"],
                        "end": ent["end"],
                        "text": ent["text"],
                        "labels": [ent["label"]]
                    },
                    "score": round(ent["score"], 4)
                })
            
            # Construct the base structure for Label Studio
            ls_item = {
                "data": {
                    "text": sentence
                },
                "predictions": [{
                    "model_version": model_version,
                    "result": ls_results
                }]
            }
            
            # Add a comma between objects, but not before the first one
            if not first_entry:
                f.write(",\n")
            first_entry = False
            
            # Dump this single entry to a string, indent it properly, and write to file
            json_str = json.dumps(ls_item, ensure_ascii=False, indent=2)
            indented_json = '\n'.join(['  ' + line for line in json_str.split('\n')])
            f.write(indented_json)
            
            # CRITICAL: Force the file to save to disk immediately
            f.flush()
            
            # Terminal Updates: Print what was found without breaking the progress bar
            if preds:
                found_summary = ", ".join([f"'{e['text']}' ({e['label']})" for e in preds])
                tqdm.write(f"✓ ID {i} Found: {found_summary}")
                
        f.write("\n]\n") # Close the JSON array properly at the very end

    print(f"\nSuccessfully generated incremental Label Studio data at {output_path}")

if __name__ == "__main__":
    main()