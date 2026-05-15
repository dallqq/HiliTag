# HiliTag Documentation Bundle

## Error Analysis Report

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

---

## Label Studio Guide

# Label Studio Guide: Hiligaynon NER Annotation

## 1. Overview
This guide provides instructions for importing AI-prelabeled Hiligaynon data into Label Studio, manually correcting bounds and categorizations, and exporting the refined 20% subset as the immutable "Gold Standard" test set.

## 2. Label Studio Setup
1. **Install and Run:**
   ```bash
   pip install label-studio
   label-studio
   ```
2. **Create Project:**
   - Name: `Hiligaynon NER - Gold Standard`
   - Import `data/dataset_silver_standard.json` or the pre-labeled JSON file generated from Sub-Phase 1.2.

3. **Labeling Interface Configuration:**
   Go to Settings > Labeling Interface > Code, and use the following template for the 18 OntoNotes 5.0 categories:
   ```xml
   <View>
     <Labels name="label" toName="text">
       <Label value="PERSON" background="#FF0000"/>
       <Label value="NORP" background="#0000FF"/>
       <Label value="FAC" background="#008000"/>
       <Label value="ORG" background="#FFA500"/>
       <Label value="GPE" background="#800080"/>
       <Label value="LOC" background="#FFFF00"/>
       <Label value="PRODUCT" background="#FFC0CB"/>
       <Label value="EVENT" background="#00FFFF"/>
       <Label value="WORK_OF_ART" background="#808080"/>
       <Label value="LAW" background="#A52A2A"/>
       <Label value="LANGUAGE" background="#000000"/>
       <Label value="DATE" background="#FF00FF"/>
       <Label value="TIME" background="#00FF00"/>
       <Label value="PERCENT" background="#000080"/>
       <Label value="MONEY" background="#808000"/>
       <Label value="QUANTITY" background="#008080"/>
       <Label value="ORDINAL" background="#C0C0C0"/>
       <Label value="CARDINAL" background="#FFD700"/>
     </Labels>
     <Text name="text" value="$text"/>
   </View>
   ```

## 3. Linguistic & Annotation Guidelines

### 3.1. Tagging Scheme
The project strictly uses the **BIOES** (Begin, Inside, Outside, End, Single) tagging scheme. However, during Label Studio annotation, you will select the entire entity span. The conversion script (`preprocessing/json_to_bioes.py`) will automatically map your span selections to strictly adhere to the BIOES boundaries.

### 3.2. Preservation of Hiligaynon Morphology (CRITICAL)
- **Do not over-split tokens.** 
- **Affixes are strictly preserved:** Keep Hiligaynon prefixes, infixes, and suffixes connected to their root words.
- *Example:* If an organization is referred to with a prefix, e.g., "gin-DepEd" or "pag-Iloilo", highlight the entire word `gin-DepEd` or `pag-Iloilo` as the entity (`ORG` or `GPE` respectively). The NLP pipeline relies on these complete contexts to understand morphological grammar.

### 3.3. Correcting AI Biases
- Pay close attention to distinguishing between `GPE` (Geo-Political Entity, like cities/countries that act as governments/places) and `ORG` (Organizations).
- Look out for Taglish/mixed-code biases, where the AI might have missed Hiligaynon concepts mapped to English labels.

## 4. Exporting the Gold Standard
1. Once approximately 20% (~500 sentences) have been rigorously verified and corrected, click **Export** in the top right.
2. Select **JSON** format.
3. Save the exported structure to `data/dataset_gold_standard.json`.

---

## Metrics Note

=== Hiligaynon NER Strict Entity-Level Metrics ===

Dataset missing! Unable to generate accurate seqeval metrics. Please run the evaluation script with a trained model and Gold Standard dataset.
