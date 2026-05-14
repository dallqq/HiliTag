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
*Note: This subset will remain immutable and will act exclusively as your evaluation dataset for testing your models.*
