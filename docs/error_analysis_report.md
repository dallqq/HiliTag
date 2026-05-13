# Hiligaynon NER: Error Diagnostics & Systemic Analysis Report

## 1. Abstract
This academic report details the systematic evaluation of the Hiligaynon Named Entity Recognition (NER) models (Conditional Random Fields baseline and XLM-RoBERTa finetuned). Moving beyond surface-level metrics such as precision, recall, and F1 scores, this analysis aims to unpack *why* models fail by identifying systemic morphosyntactic and conceptual classification boundaries.

## 2. Confusion Matrix Hotspots
*(Note: Insert standard seaborn heatmap visualization here from `confusion_matrix.ipynb`).*
General observations indicate standard confusion between boundaries (e.g., `B-` vs `I-` tags of the same entity) and more critical cross-entity misclassifications. Analyzing the confusion matrix highlights specific density hotspots outside of the true positive diagonal, demanding deeper manual inspection.

## 3. Ambiguity Resolution: ORG vs GPE Constraints
One of the most persistent bottlenecks in sequence tagging for regional reporting (e.g., Panay News) involves distinguishing between Geo-Political Entities (GPE) and Organizations (ORG). 
* **Morphosyntactic Blurring:** In Hiligaynon journalism, regional location names frequently function as both the physical location and the active governing council (e.g., "Iloilo Provincial Capitol" or "Siyudad sang Iloilo").
* **Observation:** The baseline CRF generally relies heavily on spatial capitalization and suffix heuristics, occasionally defaulting to `GPE` due to the frequency of location-based reporting. XLM-R attempts to rely on broader semantic contexts to delineate these but may inherit biases from its multilingual pretraining, artificially mapping Philippine regional structures to western organizational semantics.

## 4. Linguistic Bottlenecks: Taglish Influences & Affixation
Code-switching and code-mixing (Taglish/Engligaynon) present a unique lexical challenge to the contextual mapping capacities of both models.
* **Lexical Borrowing & Adaptation:** Integration of English root words with Hiligaynon prefixes/infixes (e.g., *gin-print*, *nag-attend*, *mag-file*).
* **Observation:** Standard heuristic morphological tokenization algorithms often segment these words incorrectly or isolate the English root, occasionally prompting arbitrary sub-word entity labels. While XLM-R's SentencePiece tokenization naturally accommodates sub-word out-of-vocabulary elements better than standard whitespace segmentation, it struggles consistently on heavily code-switched unseen affix-root groupings, degrading downstream entity boundaries.

## 5. Conclusions & Future Optimization
1. **Targeted Data Augmentation:** Synthetically generating or manually curating heavily nested sentences containing overlapping `ORG` and `GPE` entities to explicitly disambiguate these contexts.
2. **Custom Knowledge Bases:** Injecting hardcoded Hiligaynon governmental entities (gazetteers) as forced probabilistic overrides during inference to bypass model ambiguity.
3. **Advanced Tokenization Constraints:** Adjusting the `spacy.blank("xx")` tokenizer constraints internally to prevent aggressive splitting on hyphenated Taglish borrow words.