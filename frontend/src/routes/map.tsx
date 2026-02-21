import { createFileRoute } from "@tanstack/react-router"
import Map from "../components/map"

type Shop = {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
  distanceMi?: number
  rating?: number
  reviewCount?: number
  tags?: string[]
  imageUrl?: string
  isOpenNow?: boolean
}

// ✅ change this to your real endpoint
async function fetchShops(): Promise<Shop[]> {
  const res = await fetch("http://localhost:8000/api/shops") // or "http://localhost:8000/shops"
  if (!res.ok) throw new Error(`Failed to fetch shops: ${res.status}`)
  return res.json()
}

export const Route = createFileRoute("/map")({
  loader: async () => {
    const shops = await fetchShops()
    return { shops }
  },
  component: MapPage,
})

function ShopCard({ shop }: { shop: Shop }) {
  return (
    <button
      className="w-full text-left rounded-xl border border-black/10 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      type="button"
      // onClick={() => focusMap(shop)} // later
    >
      <div className="flex gap-3 p-3">
        <div className="h-20 w-28 rounded-lg bg-black/5 overflow-hidden shrink-0">
          {shop.imageUrl ? (
            <img
              src={shop.imageUrl}
              alt={shop.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{shop.name}</div>
          <div className="text-sm text-black/60 truncate">{shop.address}</div>
          <div className="text-sm text-black/60 truncate">{shop.city}</div>

          <div className="mt-2 flex flex-wrap gap-2">
            {shop.rating != null ? (
              <span className="text-xs rounded-full bg-black/5 px-2 py-1">
                ⭐ {shop.rating.toFixed(1)}
                {shop.reviewCount != null ? ` (${shop.reviewCount})` : ""}
              </span>
            ) : null}

            {shop.isOpenNow != null ? (
              <span
                className={`text-xs rounded-full px-2 py-1 ${
                  shop.isOpenNow
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-rose-500/10 text-rose-700"
                }`}
              >
                {shop.isOpenNow ? "Open now" : "Closed"}
              </span>
            ) : null}

            {(shop.tags ?? []).slice(0, 3).map((t) => (
              <span key={t} className="text-xs rounded-full bg-black/5 px-2 py-1">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

function MapPage() {
  const { shops } = Route.useLoaderData()

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-background">
      <div className="flex h-full w-full">
        {/* MAP AREA */}
        <div className="relative z-0 flex-1 h-full">
          {/* optionally pass to map so it can render markers */}
          <Map shops={shops} />
        </div>

        {/* RIGHT SIDEBAR */}
        <aside
          className="relative z-20 h-full w-[800px] bg-[rgb(250,250,250)] border-l border-black/10
                     shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.6)]"
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-[rgb(250,250,250)] p-4 border-b border-black/10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                Shops ({shops.length})
              </h2>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="h-[calc(100%-64px)] overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-3">
              {shops.map((s) => (
                <ShopCard key={s.id} shop={s} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}