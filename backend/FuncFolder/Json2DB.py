import json
from supabase import create_client, Client

url: str = "https://iofbbgeonizbqvvntely.supabase.co"
key: str = "sb_publishable_d8ETrLfDZDFCqKT58AdOUQ_e3n5LHnU"
supabase: Client = create_client(url, key)

# ── File paths ──
LOCATION_FILES = ["out_club.json", "out_liquor.json", "out_smoke.json"]
REVIEWS_FILE = "all_reviews-2.json"

# =====================================================================
# STEP 1 ─ Insert locations from out_club / out_liquor / out_smoke
# =====================================================================
# Maps location name -> location_id returned by DB
locations_map: dict[str, int] = {}
loc_inserted = 0

for filepath in LOCATION_FILES:
    with open(filepath, "r", encoding="utf-8") as f:
        raw = json.load(f)

    items = raw.get("data", [])
    print(f"[*] Loaded {len(items)} locations from {filepath}")

    for item in items:
        name = item.get("Name", "").strip()
        if not name or name in locations_map:
            continue  # skip empty names or duplicates across files

        loc_data = {
            "name": name,
            "lat": item.get("Latitude"),
            "long": item.get("Longitude"),
            "addr": item.get("Fulladdress"),
        }

        try:
            # Check if location already exists before inserting
            existing = (
                supabase.table("locations")
                .select("location_id")
                .eq("name", name)
                .execute()
            )
            if existing.data:
                loc_id = existing.data[0]["location_id"]
                locations_map[name] = loc_id
                print(f"  [=] Already exists: {name} (id={loc_id})")
            else:
                result = supabase.table("locations").insert(loc_data).execute()
                loc_id = result.data[0]["location_id"]
                locations_map[name] = loc_id
                loc_inserted += 1
                print(f"  [+] {name} (id={loc_id})")
        except Exception as e:
            print(f"  [!] Error inserting '{name}': {e}")
            try:
                existing = (
                    supabase.table("locations")
                    .select("location_id")
                    .eq("name", name)
                    .execute()
                )
                if existing.data:
                    locations_map[name] = existing.data[0]["location_id"]
                    print(f"      Using existing id={locations_map[name]}")
            except Exception as e2:
                print(f"      Could not fetch existing: {e2}")

print(f"\n[+] Locations inserted: {loc_inserted}")
print(f"[+] Total locations tracked: {len(locations_map)}\n")

# =====================================================================
# STEP 2 ─ Insert reviews from google_reviews.json  [COMMENTED OUT]
# =====================================================================
with open(REVIEWS_FILE, "r", encoding="utf-8") as f:
    reviews_data = json.load(f)

print(f"[*] Loaded {len(reviews_data)} reviews from {REVIEWS_FILE}")

# Deduplicate within the file itself by review_id
seen_ids: set[str] = set()
deduped = []
for rev in reviews_data:
    rid = rev.get("review_id", "")
    if rid and rid not in seen_ids:
        seen_ids.add(rid)
        deduped.append(rev)
    elif not rid:
        deduped.append(rev)  # no id — keep but can't dedup
print(f"[*] After dedup: {len(deduped)} unique reviews (dropped {len(reviews_data) - len(deduped)} duplicates)")
reviews_data = deduped

rev_inserted = 0
rev_skipped = 0

for rev in reviews_data:
    company = rev.get("company", "").strip()
    loc_id = locations_map.get(company)

    # If the review's company isn't in the locations we just inserted,
    # try a DB lookup in case it already existed.
    if loc_id is None:
        try:
            existing = (
                supabase.table("locations")
                .select("location_id")
                .eq("name", company)
                .execute()
            )
            if existing.data:
                loc_id = existing.data[0]["location_id"]
                locations_map[company] = loc_id
        except Exception:
            pass

    if loc_id is None:
        print(f"  [!] No matching location for company '{company}' — skipping review")
        rev_skipped += 1
        continue

    review_text_obj = rev.get("review_text", {})
    review_text = review_text_obj.get("en", "") if isinstance(review_text_obj, dict) else ""

    rating = rev.get("rating")
    if rating is not None:
        rating = int(rating)

    review_row = {
        "location_id": loc_id,
        "review_content": review_text,
        "rating": rating,
    }

    try:
        supabase.table("reviews").insert(review_row).execute()
        rev_inserted += 1
    except Exception as e:
        print(f"  [!] Error inserting review by '{rev.get('author', 'N/A')}': {e}")
        rev_skipped += 1

print(f"\n[+] Done!")
print(f"    Locations tracked : {len(locations_map)}")
print(f"    Reviews inserted  : {rev_inserted}")
print(f"    Reviews skipped   : {rev_skipped}")

# =====================================================================
# STEP 3 ─ Insert location images from all three location JSON files
# =====================================================================
print("\n[*] Inserting location images...")
img_inserted = 0
img_skipped = 0

for filepath in LOCATION_FILES:
    with open(filepath, "r", encoding="utf-8") as f:
        raw = json.load(f)

    items = raw.get("data", [])
    for item in items:
        name = item.get("Name", "").strip()
        image_url = item.get("Featured Image", "").strip()
        loc_id = locations_map.get(name)

        if not name or not image_url:
            img_skipped += 1
            continue

        if loc_id is None:
            # Fallback DB lookup
            try:
                existing = (
                    supabase.table("locations")
                    .select("location_id")
                    .eq("name", name)
                    .execute()
                )
                if existing.data:
                    loc_id = existing.data[0]["location_id"]
                    locations_map[name] = loc_id
            except Exception:
                pass

        if loc_id is None:
            print(f"  [!] No location_id for '{name}' — skipping image")
            img_skipped += 1
            continue

        # Skip if image already exists for this location
        try:
            existing_img = (
                supabase.table("location_images")
                .select("id")
                .eq("location_id", loc_id)
                .execute()
            )
            if existing_img.data:
                img_skipped += 1
                continue
        except Exception:
            pass

        try:
            supabase.table("location_images").insert({
                "location_id": loc_id,
                "name": name,
                "image_url": image_url,
            }).execute()
            img_inserted += 1
            print(f"  [+] Image for: {name}")
        except Exception as e:
            print(f"  [!] Error inserting image for '{name}': {e}")
            img_skipped += 1

print(f"\n[+] Images inserted : {img_inserted}")
print(f"    Images skipped  : {img_skipped}")