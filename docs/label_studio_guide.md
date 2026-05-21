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
    Go to Settings > Labeling Interface > Code, and use the following template for the 7 project labels:
   ```xml
   <View>
     <Labels name="label" toName="text">
       <Label value="PERSON" background="#FF0000"/>
       <Label value="NORP" background="#0000FF"/>
       <Label value="ORG" background="#FFA500"/>
          <Label value="LOCATION" background="#800080"/>
       <Label value="EVENT" background="#00FFFF"/>
          <Label value="DATETIME" background="#FF00FF"/>
       <Label value="MONEY" background="#808000"/>
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
- *Example:* If an organization is referred to with a prefix, e.g., "gin-DepEd" or "pag-Iloilo", highlight the entire word `gin-DepEd` or `pag-Iloilo` as the entity (`ORG` or `LOCATION` respectively). The NLP pipeline relies on these complete contexts to understand morphological grammar.

### 3.3. Correcting AI Biases
- Pay close attention to distinguishing between `LOCATION` and `ORG`.
- Use `DATETIME` for dates, times, and date ranges.
- Look out for Taglish/mixed-code biases, where the AI might have missed Hiligaynon concepts mapped to English labels.

## 4. Exporting the Gold Standard
1. Once approximately 20% (~500 sentences) have been rigorously verified and corrected, click **Export** in the top right.
2. Select **JSON** format.
3. Save the exported structure to `data/dataset_gold_standard.json`.

---
*Note: This subset will remain immutable and will act exclusively as your evaluation dataset for testing your models.*
