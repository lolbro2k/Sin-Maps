from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow your frontend to hit this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/shops")
def get_shops():
    return [
        {
            "id": "1",
            "name": "Green Valley Liquors",
            "address": "123 Main St",
            "city": "Henderson, NV 89074",
            "lat": 36.0717,
            "lng": -115.0820,
            "rating": 4.6,
            "reviewCount": 214,
            "tags": ["Beer", "Wine", "Spirits"],
            "imageUrl": "https://picsum.photos/seed/liquor1/400/300",
            "isOpenNow": True,
        },
        {
            "id": "2",
            "name": "Sunset Bottle Shop",
            "address": "455 Sunset Rd",
            "city": "Henderson, NV 89074",
            "lat": 36.0639,
            "lng": -115.0742,
            "rating": 4.3,
            "reviewCount": 98,
            "tags": ["Craft", "Local"],
            "imageUrl": "https://picsum.photos/seed/liquor2/400/300",
            "isOpenNow": False,
        },
        {
            "id": "3",
            "name": "Warm Springs Wine & Spirits",
            "address": "789 Warm Springs Rd",
            "city": "Henderson, NV 89074",
            "lat": 36.0581,
            "lng": -115.0897,
            "rating": 4.8,
            "reviewCount": 342,
            "tags": ["Wine", "Premium"],
            "imageUrl": "https://picsum.photos/seed/liquor3/400/300",
            "isOpenNow": True,
        },
    ]
