from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from typing import Optional

url: str = "https://iofbbgeonizbqvvntely.supabase.co/"
key: str = "sb_publishable_d8ETrLfDZDFCqKT58AdOUQ_e3n5LHnU"
supabase: Client = create_client(url, key)


app = FastAPI()

# Allow your frontend to hit this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _avg_rating(reviews: list[dict]) -> Optional[float]:
    ratings = [r["rating"] for r in reviews if r.get("rating") is not None]
    if not ratings:
        return None
    return round(sum(ratings) / len(ratings), 1)


@app.get("/api/locations")
def get_locations():
    """Return all locations with their first image and average review rating."""
    response = (
        supabase
        .table("locations")
        .select("location_id, name, lat, long, addr, location_images(image_url), reviews(rating)")
        .execute()
    )
    locations = response.data or []

    result = []
    for loc in locations:
        # Skip locations without valid coordinates
        if loc.get("lat") is None or loc.get("long") is None:
            continue

        images = loc.get("location_images") or []
        reviews = loc.get("reviews") or []
        image_url = images[0]["image_url"] if images and images[0].get("image_url") else None

        result.append({
            "id": loc["location_id"],
            "name": loc["name"],
            "lat": loc["lat"],
            "lng": loc["long"],
            "addr": loc.get("addr"),
            "imageUrl": image_url,
            "rating": _avg_rating(reviews),
            "reviewCount": len(reviews),
        })

    return result


@app.get("/api/locations/{location_id}")
def get_location(location_id: int):
    """Return a single location with all images, reviews, and risk report."""
    loc_resp = (
        supabase
        .table("locations")
        .select("location_id, name, lat, long, addr")
        .eq("location_id", location_id)
        .single()
        .execute()
    )
    if not loc_resp.data:
        raise HTTPException(status_code=404, detail="Location not found")

    loc = loc_resp.data

    images_resp = (
        supabase
        .table("location_images")
        .select("id, name, image_url")
        .eq("location_id", location_id)
        .execute()
    )

    reviews_resp = (
        supabase
        .table("reviews")
        .select("review_id, review_content, rating")
        .eq("location_id", location_id)
        .execute()
    )

    risk_resp = (
        supabase
        .table("risk_reports")
        .select("id, business_name, summary, risk_score, risk_reason")
        .eq("location_id", location_id)
        .execute()
    )

    reviews = reviews_resp.data or []

    return {
        "id": loc["location_id"],
        "name": loc["name"],
        "lat": loc.get("lat"),
        "lng": loc.get("long"),
        "addr": loc.get("addr"),
        "images": images_resp.data or [],
        "reviews": reviews,
        "rating": _avg_rating(reviews),
        "reviewCount": len(reviews),
        "riskReport": risk_resp.data[0] if risk_resp.data else None,
    }


@app.get("/api/locations/{location_id}/reviews")
def get_reviews(location_id: int):
    """Return all reviews for a location."""
    response = (
        supabase
        .table("reviews")
        .select("review_id, review_content, rating")
        .eq("location_id", location_id)
        .execute()
    )
    return response.data or []


@app.get("/api/locations/{location_id}/risk-report")
def get_risk_report(location_id: int):
    """Return the risk report for a location."""
    response = (
        supabase
        .table("risk_reports")
        .select("id, business_name, summary, risk_score, risk_reason")
        .eq("location_id", location_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="No risk report found for this location")
    return response.data[0]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
