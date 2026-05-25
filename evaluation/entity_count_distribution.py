import json
import os
from collections import Counter

import matplotlib.pyplot as plt


BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "..", "data", "splits", "verified")
OUTPUT_DIR = os.path.join(BASE_DIR, "docs")
OUTPUT_IMAGE = os.path.join(OUTPUT_DIR, "entity_count_distribution.png")
OUTPUT_LABEL_IMAGE = os.path.join(OUTPUT_DIR, "entity_type_distribution.png")

DATASETS = {
    "Test": os.path.join(DATA_DIR, "dataset_test_final.json"),
    "Train": os.path.join(DATA_DIR, "dataset_train_final.json"),
    "Validation": os.path.join(DATA_DIR, "dataset_val_final.json"),
}


def load_dataset(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset not found: {path}")

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def extract_results(item):
    annotations = item.get("annotations") or []
    if annotations:
        for annotation in annotations:
            for result in annotation.get("result", []):
                yield result
        return

    predictions = item.get("predictions") or []
    for prediction in predictions:
        for result in prediction.get("result", []):
            yield result


def count_entities(records):
    total_count = 0
    label_counts = Counter()

    for item in records:
        for result in extract_results(item):
            if result.get("type") != "labels":
                continue

            value = result.get("value", {})
            labels = value.get("labels") or []
            if not labels:
                continue

            total_count += 1
            label_counts[labels[0]] += 1

    return total_count, label_counts


def build_chart(summary):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    names = list(summary.keys())
    counts = [summary[name]["total"] for name in names]

    plt.figure(figsize=(9, 6))
    bars = plt.bar(names, counts, color=["#1f77b4", "#ff7f0e", "#2ca02c"], width=0.6)

    plt.title("Entity Count Distribution Across Dataset Splits")
    plt.xlabel("Dataset Split")
    plt.ylabel("Total Entity Count")
    plt.grid(axis="y", linestyle="--", alpha=0.3)

    peak = max(counts) if counts else 0
    offset = peak * 0.01 if peak else 1

    for bar, count in zip(bars, counts):
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + offset,
            str(count),
            ha="center",
            va="bottom",
            fontsize=10,
        )

    plt.tight_layout()
    plt.savefig(OUTPUT_IMAGE, dpi=200, bbox_inches="tight")
    plt.close()


def build_label_chart(label_counts):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    labels = list(label_counts.keys())
    counts = [label_counts[label] for label in labels]

    plt.figure(figsize=(10, 6))
    bars = plt.bar(labels, counts, color="#6a4c93", width=0.65)

    plt.title("Combined Entity Type Distribution Across All Splits")
    plt.xlabel("Entity Type")
    plt.ylabel("Total Count")
    plt.grid(axis="y", linestyle="--", alpha=0.3)
    plt.xticks(rotation=30, ha="right")

    peak = max(counts) if counts else 0
    offset = peak * 0.01 if peak else 1

    for bar, count in zip(bars, counts):
        plt.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + offset,
            str(count),
            ha="center",
            va="bottom",
            fontsize=10,
        )

    plt.tight_layout()
    plt.savefig(OUTPUT_LABEL_IMAGE, dpi=200, bbox_inches="tight")
    plt.close()


def main():
    summary = {}
    combined_label_counts = Counter()

    for display_name, path in DATASETS.items():
        records = load_dataset(path)
        total_count, label_counts = count_entities(records)
        combined_label_counts.update(label_counts)
        summary[display_name] = {
            "total": total_count,
            "labels": label_counts,
            "records": len(records),
        }

    print("Entity count summary")
    for display_name in DATASETS:
        print(f"- {display_name}: {summary[display_name]['total']} entities across {summary[display_name]['records']} records")
        if summary[display_name]["labels"]:
            breakdown = ", ".join(f"{label}={count}" for label, count in summary[display_name]["labels"].most_common())
            print(f"  {breakdown}")

    build_chart(summary)
    print("\nCombined entity type distribution")
    for label, count in combined_label_counts.most_common():
        print(f"- {label}: {count}")

    build_label_chart(combined_label_counts)
    print(f"\nSaved chart to {OUTPUT_IMAGE}")
    print(f"Saved label chart to {OUTPUT_LABEL_IMAGE}")


if __name__ == "__main__":
    main()