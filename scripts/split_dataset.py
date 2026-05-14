import json
import os
import random
from collections import defaultdict

def main():
    # Set fixed seed for exact reproducibility and preventing data leakage across runs
    random.seed(42)

    input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'dataset_silver_for_labelstudio.json')
    
    # Improve folder structure by generating a dedicated 'splits' subdirectory
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'splits')
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        return

    print(f"Loading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Stratify by entity count
    # This ensures sentences with lots of entities vs zero entities are distributed evenly
    buckets = defaultdict(list)
    for i, item in enumerate(data):
        try:
            results = item.get("predictions", [{}])[0].get("result", [])
            ent_count = len(results)
        except (KeyError, IndexError):
            ent_count = 0
        
        # Cap strata at 3+ to maintain distinct bucket populations
        bucket_id = min(ent_count, 3)
        buckets[bucket_id].append(i)

    train_idxs = []
    val_idxs = []
    test_idxs = []

    print("Stratifying and computing splits (80% Train, 10% Val, 10% Test)...")
    for bucket_id, idxs in buckets.items():
        random.shuffle(idxs)
        n = len(idxs)
        
        # Calculate proportional size
        test_count = int(n * 0.10)
        val_count = int(n * 0.10)
        
        # Slice bounds
        test_idxs.extend(idxs[:test_count])
        val_idxs.extend(idxs[test_count:test_count+val_count])
        train_idxs.extend(idxs[test_count+val_count:])

    # Sort indices to maintain general chronological order matching the source
    train_idxs.sort()
    val_idxs.sort()
    test_idxs.sort()

    print(f"\n--- Split Summary ---")
    print(f"Total clean sentences: {len(data)}")
    print(f"Train subset: {len(train_idxs)}")
    print(f"Validation subset (Gold candidates): {len(val_idxs)}")
    print(f"Test subset (Gold candidates): {len(test_idxs)}")

    # 2. Save split indices mapping inside the splits folder
    indices_path = os.path.join(output_dir, 'split_indices.json')
    with open(indices_path, 'w', encoding='utf-8') as f:
        json.dump({
            "train": train_idxs,
            "val": val_idxs,
            "test": test_idxs
        }, f, indent=2)
    print(f"\nSaved index architecture to {indices_path}")

    # 3. Compile physical subset datasets
    train_data = [data[i] for i in train_idxs]
    val_data = [data[i] for i in val_idxs]
    test_data = [data[i] for i in test_idxs]

    # Save 80% Train Set (Remains silver)
    with open(os.path.join(output_dir, 'dataset_train_silver.json'), 'w', encoding='utf-8') as f:
        json.dump(train_data, f, indent=2, ensure_ascii=False)
        
    # Save 10% Validation Set (For Label Studio import -> will become dataset_val_gold.json)
    with open(os.path.join(output_dir, 'dataset_val_for_gold.json'), 'w', encoding='utf-8') as f:
        json.dump(val_data, f, indent=2, ensure_ascii=False)
        
    # Save 10% Test Set (For Label Studio import -> will become dataset_test_gold.json)
    with open(os.path.join(output_dir, 'dataset_test_for_gold.json'), 'w', encoding='utf-8') as f:
        json.dump(test_data, f, indent=2, ensure_ascii=False)

    print("Generated subsets successfully in 'data/splits/'.")
    print("-> NEXT STEP 1: Import 'data/splits/dataset_val_for_gold.json' into Label Studio, correct labels, and export as 'data/splits/dataset_val_gold.json'.")
    print("-> NEXT STEP 2: Import 'data/splits/dataset_test_for_gold.json' into Label Studio, correct labels, and export as 'data/splits/dataset_test_gold.json'.")

if __name__ == "__main__":
    main()
