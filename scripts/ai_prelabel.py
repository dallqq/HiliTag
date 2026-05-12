print("Script started! Importing libraries...")
import json
import os
from gliner import GLiNER

# 18 OntoNotes 5.0 Categories
ONTONOTES_CATEGORIES = [
    "PERSON", "NORP", "FAC", "ORG", "GPE", "LOC", "PRODUCT", "EVENT", 
    "WORK_OF_ART", "LAW", "LANGUAGE", "DATE", "TIME", "PERCENT", 
    "MONEY", "QUANTITY", "ORDINAL", "CARDINAL"
]

def main():
    input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw_sentences.txt')
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dataset_silver_standard.json')
    
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        return

    print("Loading GLiNER Multilingual model...")
    # Load GLiNER Multilingual model for zero-shot NER
    model = GLiNER.from_pretrained("urchade/gliner_multi-v2.1")

    # Load raw sentences
    with open(input_path, 'r', encoding='utf-8') as f:
        sentences = [line.strip() for line in f if line.strip()]

    silver_dataset = []
    
    print(f"Starting semantic labeling for {len(sentences)} sentences using GLiNER...")
    
    for i, sentence in enumerate(sentences):
        if (i + 1) % 10 == 0 or i == 0:
            print(f"Processing ({i+1}/{len(sentences)}): {sentence[:30]}...")
            
        # Predict entities with GLiNER using the OntoNotes labels
        entities = model.predict_entities(sentence, ONTONOTES_CATEGORIES)
        
        # Format entities to maintain expected schema
        formatted_entities = []
        for ent in entities:
            formatted_entities.append({
                "text": ent["text"],
                "label": ent["label"],
                "start": ent["start"],
                "end": ent["end"]
            })
        
        silver_dataset.append({
            "id": i,
            "text": sentence,
            "entities": formatted_entities
        })

    # Save to silver standard
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(silver_dataset, f, ensure_ascii=False, indent=2)

    print(f"Successfully generated silver standard data with {len(silver_dataset)} annotated entries at {output_path}")

if __name__ == "__main__":
    main()
