import os
import re
import time
import requests
from collections import deque
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import spacy

# Ensure output directory exists
os.makedirs('data', exist_ok=True)
RAW_DATA_PATH = 'data/raw_sentences.txt'

# Load spacy sentencizer
nlp = spacy.blank("xx")
nlp.add_pipe('sentencizer')

# Pre-compile regex for massive performance boost and punctuation handling
HIL_REGEX = re.compile(r'\b(ang|sang|kag|nga|sa|kay|iya|niya|gid|man|ini|sila|diri|didto)\b', re.IGNORECASE)
EXC_REGEX = re.compile(r'\b(the|is|and|of|ng|na|yong|yung|upang|at|ngunit)\b', re.IGNORECASE)

def get_robust_session():
    """Configure a requests session with browser-like headers and retries."""
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1.5, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    
    # Advanced headers to bypass basic Cloudflare/Anti-bot protections
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
    })
    return session

def clean_text(text):
    """Clean citations, extra spaces, and journalistic boilerplate."""
    text = re.sub(r'\[\d+\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'Read More|Advertisement|Share this article|Like and follow', '', text, flags=re.IGNORECASE)
    return text.strip()

def is_hiligaynon(text):
    """
    Checks for Hiligaynon using Regex word boundaries \b. 
    This perfectly handles punctuation (e.g., "biktima." will match correctly).
    """
    hil_matches = len(set(HIL_REGEX.findall(text)))
    exc_matches = len(set(EXC_REGEX.findall(text)))
    
    # Must have at least 1 Hiligaynon marker, and strictly avoid Tagalog/English
    return hil_matches >= 1 and exc_matches <= 1

def crawl_and_scrape(session, base_url, fallback_url, container_tag, container_attr, container_val, seen_sentences, max_sentences=2000, requires_lang_check=False, path_prefix=None):
    sentences_collected = []
    visited_urls = set()
    
    urls_to_visit = deque([base_url, fallback_url])
    # [NEW] queued_urls set fixes the O(N) freeze issue when checking if URL is already queued
    queued_urls = set([base_url, fallback_url]) 
    
    parsed_base = urlparse(base_url)
    base_domain = parsed_base.netloc
    base_path_constraint = parsed_base.path if parsed_base.path != "/" else ""

    # Open file here to stream writes in real-time
    with open(RAW_DATA_PATH, 'a', encoding='utf-8') as outfile:
        
        while urls_to_visit and len(sentences_collected) < max_sentences:
            current_url = urls_to_visit.popleft()
            
            if current_url in visited_urls:
                continue
                
            visited_urls.add(current_url)
            print(f"  -> Fetching: {current_url}")
            
            try:
                time.sleep(0.5) # Politeness delay
                
                response = session.get(current_url, timeout=10)
                # Ignore non-HTML pages (like PDFs or images)
                if 'text/html' not in response.headers.get('Content-Type', ''):
                    continue
                
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # 1. Harvest Links safely
                for a_tag in soup.find_all('a', href=True):
                    href = a_tag['href']
                    # Skip javascript, mailto, etc.
                    if href.startswith(('javascript:', 'mailto:', 'tel:')):
                        continue
                        
                    full_url = urljoin(current_url, href)
                    parsed_full = urlparse(full_url)
                    
                    if parsed_full.scheme not in ['http', 'https']:
                        continue
                        
                    clean_url = parsed_full._replace(fragment="").geturl()
                    is_same_domain = base_domain in parsed_full.netloc
                    
                    if "jw.org" in base_domain:
                        is_valid_path = parsed_full.path.startswith(base_path_constraint)
                    elif path_prefix:
                        # If a specific prefix is defined (like for Wikipedia), enforce it.
                        is_valid_path = parsed_full.path.startswith(path_prefix)
                        
                        # Extra Wikipedia constraint: avoid "Special", "Talk", "User" pages
                        last_path_segment = parsed_full.path.split('/')[-1]
                        if ":" in last_path_segment:
                            is_valid_path = False
                    else:
                        is_valid_path = True
                    
                    if is_same_domain and is_valid_path and clean_url not in visited_urls and clean_url not in queued_urls:
                        if len(queued_urls) < 10000: # Limit queue memory
                            urls_to_visit.append(clean_url)
                            queued_urls.add(clean_url)

                # 2. Extract Text
                for tag in soup.find_all(['table', 'ul', 'ol', 'script', 'style', 'nav', 'footer']):
                    tag.decompose()
                    
                containers = []
                # Try specific container first
                if container_val and container_attr:
                    containers = soup.find_all(container_tag, {container_attr: container_val})
                
                # [NEW] Robust Fallback: If CSS classes changed, grab <article> or body.
                if not containers:
                    containers = soup.find_all('article')
                if not containers:
                    body = soup.find('body')
                    containers = [body] if body else []
                    
                for container in containers:
                    paragraphs = container.find_all('p')
                    for p in paragraphs:
                        text = clean_text(p.get_text())
                        if not text or len(text) < 15:
                            continue
                            
                        if requires_lang_check and not is_hiligaynon(text):
                            continue

                        doc = nlp(text)
                        for sent in doc.sents:
                            clean_sent = sent.text.strip()
                            
                            if len(clean_sent) > 20 and clean_sent not in seen_sentences: 
                                seen_sentences.add(clean_sent)
                                sentences_collected.append(clean_sent)
                                
                                # [NEW] Write instantly to disk so you don't lose data on crash
                                outfile.write(clean_sent + '\n')
                                outfile.flush() 
                                
                                if len(sentences_collected) >= max_sentences:
                                    return sentences_collected

            except requests.exceptions.RequestException as e:
                print(f"  [!] Network/Fetch failure on {current_url}: {e}")
                
    return sentences_collected

def main():
    print("Starting Web Scraping Pipeline for Hiligaynon Texts...")
    
    # Initialize/clear file
    open(RAW_DATA_PATH, 'w', encoding='utf-8').close()
    
    session = get_robust_session()
    global_seen_sentences = set() 
    
    sources = [
        {
           "name": "Bombo Radyo Iloilo",
           "url": "https://iloilo.bomboradyo.com/", 
           "fallback_url": "https://bacolod.bomboradyo.com/",
           "tag": "div",
           "attr": "class",
           "val": "entry-content",
           "lang_check": True, 
           "max": 4000
        },
        {
            "name": "Hiligaynon Wikipedia",
            "url": "https://incubator.wikimedia.org/wiki/Wp/hil",
            "fallback_url": "https://incubator.wikimedia.org/wiki/Wp/hil/Iloilo",
            "tag": "div",
            "attr": "id",
            "val": "mw-content-text",
            "lang_check": True,
            "max": 1000,
            "path_prefix": "/wiki/Wp/hil"
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
            seen_sentences=global_seen_sentences, 
            max_sentences=src["max"],
            requires_lang_check=src["lang_check"],
            path_prefix=src.get("path_prefix")
        )
                
        print(f"-> Successfully collected {len(collected)} sentences from {src['name']}")

if __name__ == "__main__":
    main()