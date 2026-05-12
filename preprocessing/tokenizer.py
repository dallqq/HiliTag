import spacy
from spacy.util import compile_prefix_regex, compile_suffix_regex, compile_infix_regex
from spacy.tokenizer import Tokenizer

def get_hiligaynon_nlp():
    """
    Initializes a custom spaCy tokenizer suited for the Hiligaynon language.
    Context: Hiligaynon relies heavily on affixes (e.g., nag-, gin-, mag-).
    This tokenizer prevents splitting on hyphens within words to preserve 
    the morphological and syntactic structure required for transformer models.
    """
    # Initialize a multi-language blank pipeline as required
    nlp = spacy.blank("xx")
    
    # Retrieve default prefix and suffix rules (handles standard punctuation like commas, periods)
    prefixes = nlp.Defaults.prefixes
    suffixes = nlp.Defaults.suffixes
    
    # Filter out infix patterns that contain hyphens to prevent splitting words like 'nag-kaon'
    infixes = tuple(pattern for pattern in nlp.Defaults.infixes if "-" not in pattern)
    
    # Rebuild the tokenizer with the modified infix rules
    nlp.tokenizer = Tokenizer(
        nlp.vocab,
        prefix_search=compile_prefix_regex(prefixes).search,
        suffix_search=compile_suffix_regex(suffixes).search,
        infix_finditer=compile_infix_regex(infixes).finditer,
        token_match=nlp.tokenizer.token_match
    )
    
    return nlp

if __name__ == "__main__":
    # Quick sanity check for the tokenization engine
    nlp = get_hiligaynon_nlp()
    
    sample_text = "Ang mga bata nag-hampang sa plasa, kag gin-ubos gid nila ang panyapon."
    doc = nlp(sample_text)
    
    print("Original Text:", sample_text)
    print("Tokens:", [token.text for token in doc])
    
    # Ensure that "nag-hampang", "gin-ubos", and punctuation are handled correctly
    assert "nag-hampang" in [t.text for t in doc], "Failed: 'nag-hampang' was split."
    assert "gin-ubos" in [t.text for t in doc], "Failed: 'gin-ubos' was split."
    assert "," in [t.text for t in doc], "Failed: Punctuation was not split correctly."
    
    print("Tokenization test passed successfully!")
