from openai import OpenAI
import json
from supabase import create_client, Client

# ── Supabase ──
url: str = "https://iofbbgeonizbqvvntely.supabase.co"
key: str = "sb_publishable_d8ETrLfDZDFCqKT58AdOUQ_e3n5LHnU"
supabase: Client = create_client(url, key)

# ── LLM ──
client = OpenAI(
    base_url="https://api.featherless.ai/v1",
    api_key="rc_b5e32d3544bd2817be04bdd11538dee07a82f084c5e07e9b5a9c755e2911dd81",
)
MODEL = "Qwen/Qwen2.5-7B-Instruct"

SYSTEM_PROMPT = """You are a business risk analyst. You will receive a business name, its average star rating, and a list of customer reviews.

Your job:
1. Write a short 2-3 sentence summary of what customers think about this business.
2. Assign a RISK SCORE from 1 to 10 (1 = very safe/reputable, 10 = extremely risky/shady).

Base the risk score on:
- Low star ratings
- Mentions of illegal activity, drugs, violence, theft, fraud, health hazards, harassment
- Complaints about safety, sketchy behavior, or shady dealings
- A high volume of negative reviews relative to positive ones

Respond ONLY in this exact JSON format (no extra text):
{
  "business_name": "<name>",
  "summary": "<2-3 sentence summary>",
  "risk_score": <1-10>,
  "risk_reason": "<1 sentence explaining the score>"
}"""


def fetch_locations_with_reviews():
    """Pull all locations and their reviews from Supabase."""
    result = (
        supabase.table("locations")
        .select("location_id, name, lat, long, addr, reviews(review_content, rating)")
        .execute()
    )
    return result.data


def build_review_block(location: dict) -> str:
    """Format reviews into a readable text block for the LLM prompt."""
    reviews = location.get("reviews", [])
    if not reviews:
        return "No reviews available."

    ratings = [r["rating"] for r in reviews if r.get("rating") is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

    lines = [f"Average Rating: {avg_rating:.1f} / 5  ({len(reviews)} reviews)\n"]
    for i, r in enumerate(reviews, 1):
        text = (r.get("review_content") or "").strip()
        star = r.get("rating", "?")
        if text:
            lines.append(f"  {i}. [{star} stars] {text}")
        else:
            lines.append(f"  {i}. [{star} stars] (no text)")

    return "\n".join(lines)


def analyze_business(name: str, review_block: str) -> dict:
    """Send the review block to the LLM and parse the JSON response."""
    user_msg = f"Business: {name}\n\n{review_block}"

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()

    # Try to extract JSON even if the model wraps it in markdown fences
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "business_name": name,
            "summary": raw,
            "risk_score": "N/A",
            "risk_reason": "Could not parse LLM response.",
        }


def upsert_risk_reports(results: list[dict]):
    """Insert or update risk reports in Supabase after agent analysis."""
    inserted = 0
    skipped = 0

    for entry in results:
        biz_name = entry.get("business_name", "").strip()
        if not biz_name:
            skipped += 1
            continue

        # Resolve location_id from DB
        loc_id = None
        try:
            res = (
                supabase.table("locations")
                .select("location_id")
                .eq("name", biz_name)
                .execute()
            )
            if res.data:
                loc_id = res.data[0]["location_id"]
        except Exception:
            pass

        risk_score = entry.get("risk_score")
        if isinstance(risk_score, str):
            risk_score = None  # discard "N/A" or parse failures

        risk_row = {
            "location_id": loc_id,
            "business_name": biz_name,
            "summary": entry.get("summary", ""),
            "risk_score": risk_score,
            "risk_reason": entry.get("risk_reason", ""),
        }

        try:
            # Check if a report already exists and update it, otherwise insert
            existing = (
                supabase.table("risk_reports")
                .select("id")
                .eq("business_name", biz_name)
                .execute()
            )
            if existing.data:
                report_id = existing.data[0]["id"]
                supabase.table("risk_reports").update(risk_row).eq("id", report_id).execute()
                print(f"  [~] Updated: {biz_name} (risk={risk_score})")
            else:
                supabase.table("risk_reports").insert(risk_row).execute()
                print(f"  [+] Inserted: {biz_name} (risk={risk_score})")
            inserted += 1
        except Exception as e:
            print(f"  [!] Error upserting risk report for '{biz_name}': {e}")
            skipped += 1

    print(f"\n[+] Risk reports upserted : {inserted}")
    print(f"    Risk reports skipped  : {skipped}")


def main():
    locations = fetch_locations_with_reviews()
    print(f"[*] Found {len(locations)} locations in the database.\n")
    print("=" * 70)

    results = []

    for loc in locations:
        name = loc["name"]
        review_block = build_review_block(loc)

        print(f"\n>> Analyzing: {name}")
        analysis = analyze_business(name, review_block)
        results.append(analysis)

        score = analysis.get("risk_score", "?")
        summary = analysis.get("summary", "")
        reason = analysis.get("risk_reason", "")

        print(f"   Risk Score : {score}/10")
        print(f"   Summary   : {summary}")
        print(f"   Reason    : {reason}")
        print("-" * 70)

    # Save full results to JSON
    with open("risk_report.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n[+] Full report saved to risk_report.json")

    # Push results directly into Supabase
    print("\n[*] Upserting risk reports into Supabase...")
    upsert_risk_reports(results)


if __name__ == "__main__":
    main()
