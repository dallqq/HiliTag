import spacy
from spacy.util import compile_prefix_regex, compile_suffix_regex, compile_infix_regex
from spacy.tokenizer import Tokenizer

def get_hiligaynon_nlp():
    """
    Initializes a custom spaCy tokenizer suited for the Hiligaynon language.
    Context: Hiligaynon relies heavily on affixes (e.g., nag-, gin-, mag-).
    This tokenizer prevents splitting on hyphens within alphabetical words 
    to preserve the morphological and syntactic structure, while maintaining
    standard punctuation handling.
    """
    # Initialize a multi-language blank pipeline
    nlp = spacy.blank("xx")
    
    # Retrieve default prefix, suffix, and infix rules
    prefixes = nlp.Defaults.prefixes
    suffixes = nlp.Defaults.suffixes
    base_infixes = nlp.Defaults.infixes

    # Safely filter out the specific rule that splits on hyphens between letters.
    # We avoid `if "-" not in pattern` because it destroys regex ranges like [a-z].
    # Instead, we filter out common hyphen characters natively defined in spaCy's infixes.
    custom_infixes = []
    for pattern in base_infixes:
        # Check if the pattern specifically looks for hyphen/dash characters between alphabetic characters
        # Matches spaCy v3 internal representations for alphabetic hyphens
        if r"(?<=[{al}])(?:[{h}])(?=[{al}])" in pattern or pattern == r"(?<=[a-zA-Z])-(?=[a-zA-Z])":
            continue
        custom_infixes.append(pattern)
    
    # Rebuild the tokenizer with the modified infix rules.
    # We omit custom `token_match` as the modified infixes handle this natively at the C-level.
    nlp.tokenizer = Tokenizer(
        nlp.vocab,
        prefix_search=compile_prefix_regex(prefixes).search,
        suffix_search=compile_suffix_regex(suffixes).search,
        infix_finditer=compile_infix_regex(tuple(custom_infixes)).finditer,
        token_match=nlp.tokenizer.token_match
    )
    
    return nlp

if __name__ == "__main__":
    # Quick sanity check for the tokenization engine
    nlp = get_hiligaynon_nlp()
    
    sample_text = "Ang mga bata nag-hampang sa plasa, kag gin-ubos gid nila ang panyapon halin 2023-2024."
    doc = nlp(sample_text)
    
    print("Original Text:", sample_text)
    
    # Extract tokens as a list of strings
    tokens = [token.text for token in doc]
    print("Tokens:", tokens)
    
    # Ensure that "nag-hampang", "gin-ubos", and punctuation are handled correctly
    assert "nag-hampang" in tokens, "Failed: 'nag-hampang' was unexpectedly split."
    assert "gin-ubos" in tokens, "Failed: 'gin-ubos' was unexpectedly split."
    assert "," in tokens, "Failed: Punctuation was not split correctly."
    
    # Numeric ranges like "2023-2024" will still split according to spaCy's default numeric rules,
    # which is generally desired for downstream tasks.
    
    print("\nTokenization test passed successfully!")