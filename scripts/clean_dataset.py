import os
import re
import unicodedata
from tqdm import tqdm

def normalize_quotes(text):
    """Normalize curly quotes to straight quotes."""
    text = text.replace('“', '"').replace('”', '"')
    text = text.replace('‘', "'").replace('’', "'")
    return text

def remove_pii_and_urls(text):
    """Strip basic PII (emails) and URLs."""
    # Remove URLs
    text = re.sub(r'http[s]?://\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)
    # Remove Emails
    text = re.sub(r'\S+@\S+\.\S+', '', text)
    return text

def is_garbage(text):
    """Filter out symbol-heavy garbage."""
    if len(text) == 0:
        return True
    
    alpha_chars = len(re.findall(r'[a-zA-Z\u00C0-\u017F]', text)) # including accented chars
    if alpha_chars / len(text) < 0.5:
        # If less than 50% of the characters are alphabet letters, it's likely garbage/symbols
        return True
    return False

def clean_and_deduplicate():
    input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw_sentences.txt')
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean_sentences.txt')
    
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        return

    print("Reading raw sentences...")
    with open(input_path, 'r', encoding='utf-8') as f:
        raw_lines = f.readlines()

    clean_lines = []
    seen_exact = set()
    seen_near = set()

    for line in tqdm(raw_lines, desc="Cleaning Dataset"):
        # 1. Unicode Normalization (NFKC)
        text = unicodedata.normalize('NFKC', line)
        
        # 2. Normalize Quotes
        text = normalize_quotes(text)
        
        # 3. Strip URLs and PII
        text = remove_pii_and_urls(text)
        
        # 4. Whitespace Normalization
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Constraints check
        if not text:
            continue
            
        # 5. Check word count limits (Min: 3, Max: 100)
        word_count = len(text.split())
        if word_count < 3 or word_count > 100:
            continue
            
        # 6. Filter symbol-heavy garbage
        if is_garbage(text):
            continue
            
        # 7. Deduplication (Exact and Near)
        # Exact deduplication is based on the exact stripped string
        if text in seen_exact:
            continue
            
        # Near deduplication is based on stripping all non-alphanumeric chars and lowercasing
        skeleton = re.sub(r'[^a-z0-9]', '', text.lower())
        if skeleton in seen_near:
            continue
            
        # If it passed all filters, keep it
        seen_exact.add(text)
        seen_near.add(skeleton)
        clean_lines.append(text)

    print(f"Original sentences: {len(raw_lines)}")
    print(f"Cleaned sentences: {len(clean_lines)}")
    print(f"Removed: {len(raw_lines) - len(clean_lines)} noisy/duplicate sentences.")

    # Write the cleaned sentences
    print(f"Saving cleaned sentences to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        for cl in clean_lines:
            f.write(cl + "\n")

    print("Cleaning complete!")

if __name__ == "__main__":
    clean_and_deduplicate()
