"""
Yelp Review Scraper — Single Business (Selenium)
Given a business name and location, finds it on Yelp using a real browser,
scrapes its reviews, filters by keywords, and saves matched reviews to CSV.
"""

import csv
import json
import re
import time
from urllib.parse import quote_plus

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, NoSuchElementException, WebDriverException,
)
from webdriver_manager.chrome import ChromeDriverManager

# ──────────────────────────────────────────────
# CONFIGURATION — edit these to customise the scrape
# ──────────────────────────────────────────────

# Keywords to look for in reviews (case-insensitive).
# A review is saved if it contains ANY of these words.
KEYWORDS = [
    "hookah", "shisha", "cigar", "pipe", "tobacco",
    "vape", "e-liquid", "disposable", "rolling papers",
    "glass", "bong", "grinder", "kratom", "CBD",
    "friendly", "selection", "price", "cheap", "expensive",
    "discount", "quality", "service", "recommend",
]

# How many review pages to scrape per business (10 reviews per page)
MAX_REVIEW_PAGES = 5

# Seconds to wait between page loads
PAGE_DELAY = 3

# Set to True to see the browser window (useful for debugging)
HEADLESS = True

BASE_URL = "https://www.yelp.com"

# ──────────────────────────────────────────────


def create_driver() -> webdriver.Chrome:
    """Create and return a configured Chrome WebDriver."""
    opts = Options()
    if HEADLESS:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
    # Suppress automation flags
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument("--disable-blink-features=AutomationControlled")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)

    # Hide webdriver property
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"},
    )
    return driver


def make_yelp_slug(name: str, city: str) -> str:
    """Convert a business name + city into a Yelp URL slug.
    e.g. 'EZ Smokez Smoke Shop' + 'Las Vegas' -> 'ez-smokez-smoke-shop-las-vegas'
    """
    raw = f"{name} {city}"
    slug = raw.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def build_biz_url(driver: webdriver.Chrome, name: str, city: str) -> dict | None:
    """
    Build a Yelp business URL from name + city and verify it loads.
    Tries the direct slug first, then numbered variants (-2 through -10).
    Falls back to a Yelp search if no direct URL works.
    Returns a dict with keys: name, url.
    """
    slug = make_yelp_slug(name, city)

    for suffix in ["", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9", "-10"]:
        url = f"{BASE_URL}/biz/{slug}{suffix}#reviews"
        print(f"  [*] Trying: {url}")
        try:
            driver.get(url)
            time.sleep(PAGE_DELAY)

            # Check we landed on a valid business page
            if "/biz/" not in driver.current_url:
                continue

            # Try to grab the business name from the <h1>
            try:
                h1 = driver.find_element(By.CSS_SELECTOR, "h1")
                page_name = h1.text.strip()
            except NoSuchElementException:
                page_name = name

            if page_name:
                print(f"  [+] Found: {page_name}")
                return {"name": page_name, "url": driver.current_url.split("?")[0]}
        except WebDriverException as exc:
            print(f"  [!] Error loading {url}: {exc}")
            continue

    # Fallback: Yelp search
    print("  [*] Direct URL not found, falling back to search...")
    search_url = (
        f"{BASE_URL}/search?find_desc={quote_plus(name)}"
        f"&find_loc={quote_plus(city)}"
    )
    try:
        driver.get(search_url)
        time.sleep(PAGE_DELAY)
        link = driver.find_element(By.CSS_SELECTOR, 'a[href*="/biz/"]')
        href = link.get_attribute("href").split("?")[0]
        biz_name = link.text.strip() or name
        print(f"  [+] Found via search: {biz_name}")
        return {"name": biz_name, "url": href}
    except (NoSuchElementException, WebDriverException):
        pass

    return None


def extract_json_ld(driver: webdriver.Chrome) -> dict | None:
    """Extract JSON-LD structured data from the current page."""
    try:
        scripts = driver.find_elements(By.CSS_SELECTOR, 'script[type="application/ld+json"]')
        for script in scripts:
            text = script.get_attribute("innerHTML")
            if text:
                data = json.loads(text)
                if isinstance(data, dict) and "review" in data:
                    return data
    except (json.JSONDecodeError, WebDriverException):
        pass
    return None


def scrape_reviews(driver: webdriver.Chrome, biz: dict, max_pages: int) -> list[dict]:
    """
    Scrape reviews from a single Yelp business page using Selenium.
    Returns a list of dicts with keys:
        business_name, reviewer, date, rating, text
    """
    reviews = []
    base_url = biz["url"].split("#")[0]

    for page in range(max_pages):
        start = page * 10
        url = base_url + (f"?start={start}" if start else "") + "#reviews"
        print(f"  [*] Reviews page {page + 1}: {url}")

        try:
            driver.get(url)
            time.sleep(PAGE_DELAY)

            # Wait for review content to appear
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, '[aria-label*="star rating"], [data-review-id], span[lang="en"]')
                    )
                )
            except TimeoutException:
                print("    [!] Timed out waiting for reviews to load.")

            # --- Strategy 1: JSON-LD ---
            if page == 0:
                ld = extract_json_ld(driver)
                if ld and "review" in ld:
                    for rev in ld["review"]:
                        reviews.append({
                            "business_name": biz["name"],
                            "reviewer": rev.get("author", {}).get("name", "N/A"),
                            "date": rev.get("datePublished", "N/A"),
                            "rating": rev.get("reviewRating", {}).get("ratingValue", "N/A"),
                            "text": rev.get("description", "").strip(),
                        })
                    if reviews:
                        print(f"    -> Got {len(reviews)} reviews from JSON-LD")
                        continue

            # --- Strategy 2: Selenium element parsing ---
            # Try multiple selectors for review containers
            containers = driver.find_elements(By.CSS_SELECTOR, '[data-review-id]')
            if not containers:
                containers = driver.find_elements(By.CSS_SELECTOR, "li.margin-b5__09f24__pTvws")
            if not containers:
                # Broader: find divs that contain both a star rating and a lang="en" span
                containers = driver.find_elements(
                    By.XPATH,
                    '//div[.//div[contains(@aria-label,"star rating")] and .//span[@lang="en"]]'
                )

            page_count = 0
            for container in containers:
                # Reviewer name
                try:
                    user_el = container.find_element(By.CSS_SELECTOR, 'a[href*="/user_details"]')
                    reviewer = user_el.text.strip()
                except NoSuchElementException:
                    reviewer = "N/A"

                # Rating
                rating = "N/A"
                try:
                    rating_el = container.find_element(
                        By.CSS_SELECTOR, 'div[aria-label*="star rating"]'
                    )
                    label = rating_el.get_attribute("aria-label") or ""
                    m = re.search(r"([\d.]+)", label)
                    if m:
                        rating = m.group(1)
                except NoSuchElementException:
                    pass

                # Date
                date_str = "N/A"
                try:
                    # Yelp dates are often in spans like "1/15/2026"
                    date_els = container.find_elements(By.TAG_NAME, "span")
                    for el in date_els:
                        txt = el.text.strip()
                        if re.match(r"\d{1,2}/\d{1,2}/\d{4}", txt):
                            date_str = txt
                            break
                except NoSuchElementException:
                    pass

                # Review text
                text = ""
                try:
                    text_el = container.find_element(By.CSS_SELECTOR, 'span[lang="en"]')
                    text = text_el.text.strip()
                except NoSuchElementException:
                    try:
                        text_el = container.find_element(
                            By.CSS_SELECTOR, 'p[class*="comment"]'
                        )
                        text = text_el.text.strip()
                    except NoSuchElementException:
                        pass

                if text:
                    reviews.append({
                        "business_name": biz["name"],
                        "reviewer": reviewer,
                        "date": date_str,
                        "rating": rating,
                        "text": text,
                    })
                    page_count += 1

            print(f"    -> Parsed {page_count} reviews from HTML")

            if not containers:
                print("    [!] No review containers found, stopping.")
                break

        except WebDriverException as exc:
            print(f"  [!] Error on page {page + 1}: {exc}")
            break

    return reviews


def filter_reviews(reviews: list[dict], keywords: list[str]) -> list[dict]:
    """Keep only reviews whose text contains at least one keyword."""
    kw_lower = [kw.lower() for kw in keywords]
    matched = []
    for rev in reviews:
        text_lower = rev["text"].lower()
        found = [kw for kw in kw_lower if kw in text_lower]
        if found:
            rev["matched_keywords"] = ", ".join(found)
            matched.append(rev)
    return matched


def save_to_csv(reviews: list[dict], filepath: str):
    """Write reviews to a CSV file."""
    if not reviews:
        print("[!] No reviews to save.")
        return
    fieldnames = [
        "business_name", "reviewer", "date",
        "rating", "text", "matched_keywords",
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(reviews)
    print(f"[+] Saved {len(reviews)} reviews to {filepath}")


def main():
    print("=" * 60)
    print("  Yelp Review Scraper — Selenium")
    print("=" * 60 + "\n")

    # Step 1 — Get business name and location from user
    biz_name = input("Business name: ").strip()
    city = input("City (e.g. Las Vegas): ").strip()

    if not biz_name or not city:
        print("[!] Both business name and city are required.")
        return

    print(f"\n[*] Building Yelp URL for '{biz_name}' in '{city}'...\n")

    # Step 2 — Launch browser
    print("[*] Starting Chrome...")
    driver = create_driver()

    try:
        # Step 3 — Build / resolve the Yelp URL
        biz = build_biz_url(driver, biz_name, city)
        if biz is None:
            print("[!] Could not find the business on Yelp. Exiting.")
            return

        # Step 4 — Scrape reviews
        print(f"\n[*] Scraping reviews for: {biz['name']}")
        all_reviews = scrape_reviews(driver, biz, MAX_REVIEW_PAGES)
        print(f"\n[+] Total reviews scraped: {len(all_reviews)}")

        # Step 5 — Filter by keywords
        matched = filter_reviews(all_reviews, KEYWORDS)
        print(f"[+] Reviews matching keywords: {len(matched)}")

        # Step 6 — Save to CSV
        safe_name = re.sub(r'[^\w\s-]', '', biz['name']).strip().replace(' ', '_')[:50]
        out_file = f"{safe_name}_reviews.csv"
        all_file = f"{safe_name}_reviews_all.csv"

        save_to_csv(matched, out_file)

        for rev in all_reviews:
            if "matched_keywords" not in rev:
                rev["matched_keywords"] = ""
        save_to_csv(all_reviews, all_file)

        print("\nDone!")

    finally:
        driver.quit()
        print("[*] Browser closed.")


if __name__ == "__main__":
    main()
