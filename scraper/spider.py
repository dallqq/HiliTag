import os
import re
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import spacy

# Ensure output directory exists
os.makedirs('data', exist_ok=True)
RAW_DATA_PATH = 'data/raw_sentences.txt'

nlp = spacy.blank("xx")
nlp.add_pipe('sentencizer')

def get_robust_session():
    """Configure a requests session with automatic retries for network fallbacks."""
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1.5, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    return session

def clean_text(text):
    text = re.sub(r'\[\d+\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'Read More|Advertisement|Share this article|Like and follow', '', text, flags=re.IGNORECASE)
    return text.strip()

def is_hiligaynon(text):
    """
    Positive heuristic for Hiligaynon. 
    Checks for high-frequency Hiligaynon marker words.
    """
    # Highly specific Hiligaynon particles, conjunctions, and pronouns
    hiligaynon_markers = {" ang ", " sang ", " kag ", " nga ", " sa ", " kay ", " iya ", " niya ", " gid ", " man ", " ini ", " sila "}
    text_lower = " " + text.lower() + " "
    
    # Also filter out common English/Tagalog words just in case
    exclude_markers = {" the ", " is ", " and ", " of ", " ng ", " na ", " mga "} 
    
    hil_intersect = [w for w in hiligaynon_markers if w in text_lower]
    exc_intersect = [w for w in exclude_markers if w in text_lower]
    
    # It must contain at least one Hiligaynon marker, and we relax the English limit
    return len(hil_intersect) >= 1 and len(exc_intersect) <= 3

def crawl_and_scrape(session, base_url, fallback_url, container_tag, container_attr, container_val, max_sentences=2000, requires_lang_check=False):
    sentences_collected = []
    visited_urls = set()
    
    urls_to_visit = [base_url, fallback_url]
    parsed_base = urlparse(base_url)
    base_domain = parsed_base.netloc
    
    # Crucial: Extract the base path (e.g., '/hil/') to trap the crawler in the right language
    base_path_constraint = parsed_base.path if parsed_base.path != "/" else ""

    while urls_to_visit and len(sentences_collected) < max_sentences:
        current_url = urls_to_visit.pop(0)
        
        if current_url in visited_urls:
            continue
            
        visited_urls.add(current_url)
        print(f"  -> Fetching: {current_url}")
        
        try:
            response = session.get(current_url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 1. Harvest Links with smart boundaries
            for a_tag in soup.find_all('a', href=True):
                href = a_tag['href']
                full_url = urljoin(current_url, href)
                parsed_full = urlparse(full_url)
                
                is_same_domain = base_domain in parsed_full.netloc
                
                # Only restrict path rigidly if it's JW.org
                if "jw.org" in base_domain:
                    is_valid_path = parsed_full.path.startswith(base_path_constraint)
                else:
                    is_valid_path = True
                
                if is_same_domain and is_valid_path and full_url not in visited_urls and full_url not in urls_to_visit and len(urls_to_visit) < 5000:
                    urls_to_visit.append(full_url)

            # 2. Extract Text 
            for tag in soup.find_all(['table', 'ul', 'ol', 'script', 'style']):
                tag.decompose()
                
            if container_val:
                containers = soup.find_all(container_tag, {container_attr: container_val})
            else:
                containers = soup.find_all(container_tag)
                
            for container in containers:
                paragraphs = container.find_all('p')
                for p in paragraphs:
                    text = clean_text(p.get_text())
                    if not text or len(text) < 15:
                        continue
                        
                    # Now the language check uses positive identification
                    if requires_lang_check and not is_hiligaynon(text):
                        print(f"  [Filtered Out] {text[:60]}...")
                        continue

                    doc = nlp(text)
                    for sent in doc.sents:
                        clean_sent = sent.text.strip()
                        if len(clean_sent) > 20 and clean_sent not in sentences_collected: 
                            sentences_collected.append(clean_sent)
                            if len(sentences_collected) >= max_sentences:
                                return sentences_collected

        except requests.exceptions.RequestException as e:
            print(f"  [!] Network failure on {current_url}: {e}")
            
    return sentences_collected

def main():
    print("Starting Web Scraping Pipeline for Hiligaynon Texts...")
    open(RAW_DATA_PATH, 'w', encoding='utf-8').close()
    
    session = get_robust_session()
    
    sources = [
        {
            "name": "Bombo Radyo Iloilo",
            "url": "https://iloilo.bomboradyo.com/", 
            "fallback_url": "https://bacolod.bomboradyo.com/",
            "tag": "div",
            "attr": "class",
            "val": "entry-content",
            "lang_check": True, # Turned on for all sources now to be safe
            "max": 4000
        },
        {
            "name": "Hiligaynon Wikipedia",
            "url": "https://hil.wikipedia.org/wiki/Panguna_nga_Pakli",
            "fallback_url": "https://hil.wikipedia.org/wiki/Iloilo",
            "tag": "div",
            "attr": "id",
            "val": "mw-content-text",
            "lang_check": True,
            "max": 2500
        },
        {
            "name": "JW.org (Hiligaynon)",
            "url": "https://www.jw.org/hil/",
            "fallback_url": "https://www.jw.org/hil/library/",
            "tag": "div",
            "attr": "class",
            "val": "docSubContent",
            "lang_check": True,
            "max": 1500
        },
        {
            "name": "Panay News",
            "url": "https://www.panaynews.net/", 
            "fallback_url": "https://www.panaynews.net/category/iloilo/",
            "tag": "div",
            "attr": "class",
            "val": "td-post-content",
            "lang_check": True,
            "max": 1000
        },
        {
            "name": "Iloilo Province eLibrary",
            "url": "https://iloiloelibrary.com/", 
            "fallback_url": "https://iloiloelibrary.com/collections",
            "tag": "div", 
            "attr": None, 
            "val": None, 
            "lang_check": True,
            "max": 1000
        }
    ]
    
    for src in sources:
        print(f"\nScraping from: {src['name']}")
        collected = crawl_and_scrape(
            session=session,
            base_url=src["url"], 
            fallback_url=src["fallback_url"],
            container_tag=src["tag"], 
            container_attr=src["attr"], 
            container_val=src["val"],
            max_sentences=src["max"],
            requires_lang_check=src["lang_check"]
        )
        
        # Save this source's haul to the file right here
        with open(RAW_DATA_PATH, 'a', encoding='utf-8') as f:
            for sentence in collected:
                f.write(sentence + '\n')
                
        print(f"-> Successfully collected {len(collected)} sentences from {src['name']}")

if __name__ == "__main__":
    main()