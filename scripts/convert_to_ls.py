import json
import os

def main():
    input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dataset_silver_standard.json')
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dataset_silver_for_labelstudio.json')

    print(f"Loading data from {input_path}...")
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return

    label_studio_format = []

    print("Converting to Label Studio format...")
    for item in raw_data:
        # Create the base structure for Label Studio
        ls_item = {
            "data": {
                "text": item["text"]
            },
            "predictions": [{
                "model_version": "gliner-v2.1",
                "result": []
            }]
        }
        
        # Loop through your entities and convert them to Label Studio 'results'
        for ent in item.get("entities", []):
            result_item = {
                "from_name": "label",   # Must match <Labels name="label">
                "to_name": "text",      # Must match <Labels toName="text">
                "type": "labels",
                "value": {
                    "start": ent["start"],
                    "end": ent["end"],
                    "text": ent["text"],
                    "labels": [ent["label"]] # Note: Label Studio expects a list here
                }
            }
            # Include the score if it exists
            if "score" in ent:
                result_item["score"] = ent["score"]
                
            ls_item["predictions"][0]["result"].append(result_item)
            
        label_studio_format.append(ls_item)

    print(f"Saving formatted data to {output_path}...")
    # 2. Save the formatted data to a new file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(label_studio_format, f, indent=2, ensure_ascii=False)

    print("Conversion complete! You can now import dataset_silver_for_labelstudio.json into Label Studio.")

if __name__ == "__main__":
    main()
