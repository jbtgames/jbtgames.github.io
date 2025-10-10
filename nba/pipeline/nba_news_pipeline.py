#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# NBA Daily News -> Original Stories (No external news API)
# - Scrapes public RSS + HTML pages
# - Extracts article text
# - Dedupe + recency filters
# - Writes human-voiced stories (rule-based by default; optional LLM if OPENAI_API_KEY present)
# - Outputs Markdown + JSON into ../site/content/YYYY-MM-DD/

import os, re, json, hashlib, random, logging
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
import feedparser
import tldextract
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

try:
    from newspaper import Article
    NEWSPAPER_OK = True
except Exception:
    NEWSPAPER_OK = False

BASE_DIR   = Path(__file__).parent.resolve()
SITE_DIR   = BASE_DIR.parent / "site"
DATA_DIR   = BASE_DIR.parent / "data"
CONTENT_DIR= SITE_DIR / "content"
LOGS_DIR   = BASE_DIR.parent / "logs"
for p in (SITE_DIR, DATA_DIR, CONTENT_DIR, LOGS_DIR):
    p.mkdir(parents=True, exist_ok=True)

RECENT_HOURS   = 48
MAX_ARTICLES   = 60
MIN_BODY_CHARS = 800

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
HEADERS = {"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"}

RSS_FEEDS = [
    "https://www.espn.com/espn/rss/nba/news",
    "https://www.cbssports.com/rss/headlines/nba/",
    "https://sports.yahoo.com/nba/rss.xml",
    "https://www.si.com/nba/.rss/full",
    "https://www.hoopsrumors.com/feed",
]

HTML_PAGES = {
    "google_news": "https://news.google.com/search?q=NBA&hl=en-US&gl=US&ceid=US:en",
    "reddit_nba_hot": "https://old.reddit.com/r/nba/hot/",
}

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY","").strip()
OPENAI_MODEL   = os.getenv("OPENAI_MODEL","gpt-4o-mini")

logging.basicConfig(
    filename=str(LOGS_DIR / f"run_{datetime.utcnow().strftime('%Y%m%d')}.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("nba-pipeline")

def http_get(url, timeout=20):
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        log.warning(f"GET fail: {url} :: {e}")
        return ""

def fingerprint(s: str)->str:
    import hashlib
    return hashlib.sha256((s or "").encode("utf-8")).hexdigest()

def norm_space(s:str)->str:
    import re
    return re.sub(r"\s+", " ", s or "").strip()

def within_recent(pub_dt, hours=RECENT_HOURS)->bool:
    try:
        from datetime import datetime, timezone
        return (datetime.now(timezone.utc) - pub_dt).total_seconds() <= hours*3600
    except Exception:
        return True

def to_slug(s: str) -> str:
    import re
    s = re.sub(r"[^\w\s-]", "", (s or "").lower()).strip()
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:96] if len(s) > 100 else s

def get_domain(url: str) -> str:
    ext = tldextract.extract(url or "")
    return ".".join([p for p in [ext.domain, ext.suffix] if p])

def parse_pubdate(entry):
    for k in ("published", "updated"):
        v = getattr(entry, k, None)
        if v:
            try:
                dt = dateparser.parse(v)
                if dt and not dt.tzinfo: 
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except Exception:
                pass
    return None

def fetch_from_rss():
    items = []
    for feed in RSS_FEEDS:
        try:
            parsed = feedparser.parse(feed)
            for e in parsed.entries:
                title = norm_space(getattr(e,"title",""))
                link  = getattr(e,"link","")
                if not title or not link: 
                    continue
                pub_dt = parse_pubdate(e)
                items.append({
                    "source": "rss",
                    "feed": feed,
                    "title": title,
                    "url": link,
                    "published_at": pub_dt.isoformat() if pub_dt else None,
                    "domain": get_domain(link),
                    "summary": norm_space(BeautifulSoup(getattr(e,"summary",""),"lxml").get_text()) if getattr(e,"summary","") else ""
                })
        except Exception as ex:
            log.warning(f"RSS parse fail: {feed} :: {ex}")
    return items

def fetch_google_news():
    html = http_get(HTML_PAGES["google_news"])
    if not html: return []
    soup = BeautifulSoup(html,"lxml")
    items = []
    for a in soup.select("a[href^='./articles']"):
        link = urljoin("https://news.google.com/", a.get("href",""))
        title = norm_space(a.get_text(" "))
        if title and link:
            items.append({"source":"google_news","title":title,"url":link,"domain":get_domain(link)})
    return items

def fetch_reddit_hot():
    html = http_get(HTML_PAGES["reddit_nba_hot"])
    if not html: return []
    soup = BeautifulSoup(html,"lxml")
    posts = []
    for div in soup.select("div.thing"):
        t = div.find("a", class_="title")
        if not t: continue
        title = norm_space(t.get_text(" "))
        link = t.get("href","")
        if link.startswith("/"):
            link = urljoin("https://old.reddit.com", link)
        if title and link:
            posts.append({"source":"reddit","title":title,"url":link,"domain":get_domain(link)})
    return posts

def extract_fulltext(url: str) -> str:
    text = ""
    if NEWSPAPER_OK:
        try:
            art = Article(url)
            art.download()
            art.parse()
            text = art.text or ""
        except Exception:
            text = ""
    if not text:
        html = http_get(url)
        if not html:
            return ""
        soup = BeautifulSoup(html,"lxml")
        paras = [p.get_text(" ", strip=True) for p in soup.select("p")]
        text = "\n".join(paras)
    return norm_space(text)

def dedupe(items):
    seen = set()
    out = []
    for it in items:
        key = fingerprint((it.get("title","") + "|" + it.get("domain","")).lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out

def filter_recent_and_fetch(items):
    curated = []
    for it in items:
        keep = True
        if it.get("published_at"):
            try:
                dt = dateparser.parse(it["published_at"])
                if dt and not dt.tzinfo: 
                    dt = dt.replace(tzinfo=timezone.utc)
                if not within_recent(dt, RECENT_HOURS):
                    keep = False
            except Exception:
                pass
        if not keep:
            continue

        url = it["url"]
        if "news.google.com" in url:
            html = http_get(url)
            if html:
                soup = BeautifulSoup(html,"lxml")
                for a in soup.select("a[href]"):
                    href = a.get("href")
                    if href and href.startswith("http") and "news.google.com" not in href:
                        url = href
                        break

        body = extract_fulltext(url)
        if len(body) < MIN_BODY_CHARS:
            continue
        it["url"]    = url
        it["domain"] = get_domain(url)
        it["body"]   = body
        curated.append(it)
        if len(curated) >= MAX_ARTICLES:
            break
    return curated

TEAM_KEYWORDS = [
    "Lakers","Warriors","Celtics","Bucks","Suns","Clippers","Heat","Knicks","Nets","76ers",
    "Mavericks","Nuggets","Timberwolves","Grizzlies","Pelicans","Kings","Thunder","Jazz",
    "Spurs","Rockets","Pistons","Bulls","Cavaliers","Pacers","Hawks","Hornets","Raptors",
    "Magic","Trail Blazers","Wizards"
]

def guess_tags(text):
    tags=set()
    for t in TEAM_KEYWORDS:
        import re
        if re.search(rf"\\b{re.escape(t)}\\b", text or "", re.I):
            tags.add(t)
    import re
    cap_pairs = re.findall(r"\\b([A-Z][a-z]+ [A-Z][a-z]+)\\b", text or "")
    for name in set(cap_pairs):
        if text.count(name) >= 2:
            tags.add(name)
    return sorted(tags)

def write_like_human(title, body, source_domain):
    import re, random
    leads = [
        "It started as a footnote and ended like a headline.",
        "All the little swings added up to something big.",
        "Sometimes the box score lies. This wasn’t one of those nights.",
        "The details tell the story; the pace wrote the rhythm."
    ]
    lead = random.choice(leads)
    sents = re.split(r"(?<=[.!?])\\s+", body)
    detail_sents = [s for s in sents if re.search(r"\\b\\d{1,3}\\b", s) or re.search(r"\\bquarter|run|clutch|overtime|contract|trade|injury|defense|offense|shooting|from deep|paint|rim\\b", s, re.I)]
    random.shuffle(detail_sents)
    detail_block = " ".join(detail_sents[:3]) if detail_sents else "The game swung on tempo, spacing, and a few possessions that stretched longer than they had any right to."
    core = re.sub(r'(?i)^nba\\s*:?\\s*', '', title or '')
    headline = random.choice([
        f"{core} — What Actually Mattered",
        f"{core}: Beyond the Box Score",
        f"{core} (Here’s the Real Story)",
        f"Inside: {core}"
    ])
    sections = [
        ("The Pulse", f"{lead} {detail_block}"),
        ("The Turning Point", "Momentum didn’t flip all at once. It frayed, one possession, one coverage, one substitution at a time."),
        ("Who Tilted the Floor", "Certain matchups bent the geometry. A hot hand, a cold closeout, and a coach leaning into what the night was giving."),
        ("What It Means Next", "One result rarely rewrites a season, but it can redraw the margins. This one nudges them.")
    ]
    lines = [f"# {headline}", ""]
    lines += [f"*Sourced from reporting across {source_domain} and public coverage. Analysis and original writing below.*",""]
    for h, txt in sections:
        lines += [f"## {h}", txt, ""]
    lines += ["**Takeaway:** If the theme was execution, the subtext was nerve. And they had just enough of both."]
    return "\\n".join(lines)

def write_with_llm(title, body, source_domain):
    try:
        import openai
        openai.api_key = OPENAI_API_KEY
        prompt = f'''
You are a seasoned NBA beat writer. Write an original, human-sounding article (450–700 words) based on the source text below.
Avoid generic AI tone. Vary sentence length. Use concrete detail and subtle voice. No listicles.
Title seed: "{title}"
Source domain: {source_domain}
Source text (for facts only):
{(body or '')[:4500]}
'''
        resp = openai.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role":"user","content":prompt}],
            temperature=0.8,
            top_p=0.95
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        log.warning(f"LLM writer failed, falling back to rule-based :: {e}")
        return write_like_human(title, body, source_domain)

def author_story(item):
    title = item.get("title","")
    body  = item.get("body","")
    source_domain = item.get("domain","")
    if OPENAI_API_KEY:
        return write_with_llm(title, body, source_domain)
    return write_like_human(title, body, source_domain)

def _yaml_dump(d):
    import yaml
    return yaml.safe_dump(d, sort_keys=False, allow_unicode=True)

def save_outputs(curated):
    run_date = datetime.utcnow().strftime("%Y-%m-%d")
    out_dir  = CONTENT_DIR / run_date
    out_dir.mkdir(parents=True, exist_ok=True)

    index = []
    for it in curated:
        tags = guess_tags(it.get("body",""))
        slug = to_slug(it.get("title","")) or hashlib.md5(it.get("url","").encode()).hexdigest()[:10]
        md_path = out_dir / f"{slug}.md"
        fm = {
            "title": it.get("title",""),
            "source_url": it.get("url",""),
            "source_domain": it.get("domain",""),
            "published_at": it.get("published_at"),
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "tags": tags
        }
        article_md = author_story(it)
        md_text = "---\n" + _yaml_dump(fm) + "---\n\n" + article_md + "\n"
        md_path.write_text(md_text, encoding="utf-8")
        index.append({
            "slug": slug,
            "title": it.get("title",""),
            "path": str(md_path.relative_to(SITE_DIR)),
            "published_at": it.get("published_at"),
            "source_url": it.get("url",""),
            "domain": it.get("domain",""),
            "tags": tags
        })

    idx_path = out_dir / "index.json"
    idx_path.write_text(json.dumps(index, indent=2), encoding="utf-8")

    raw_path = DATA_DIR / "articles_raw.jsonl"
    with raw_path.open("a", encoding="utf-8") as f:
        for it in curated:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")

    return out_dir, idx_path

def main():
    log.info("Start scrape")
    all_items = []
    all_items += fetch_from_rss()
    all_items += fetch_google_news()
    all_items += fetch_reddit_hot()
    all_items = dedupe(all_items)
    curated = filter_recent_and_fetch(all_items)
    if not curated:
        log.info("No curated items this run.")
        return
    out_dir, idx_path = save_outputs(curated)
    print(f"OK: {len(curated)} stories -> {out_dir}")

if __name__ == "__main__":
    main()
