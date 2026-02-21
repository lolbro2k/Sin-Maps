import { createFileRoute } from "@tanstack/react-router"
import Map, { type Shop } from "../components/map"

async function fetchLocations(): Promise<Shop[]> {
  try {
    const res = await fetch("http://localhost:8000/api/locations")
    if (!res.ok) throw new Error(`Server error: ${res.status}`)
    return res.json()
  } catch (e) {
    console.error("Failed to fetch locations:", e)
    return []
  }
}

export const Route = createFileRoute("/map")({
  loader: async () => {
    const shops = await fetchLocations()
    return { shops }
  },
  pendingComponent: () => (
    <div className="flex h-screen w-full items-center justify-center text-black/50">
      Loading locations…
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex h-screen w-full items-center justify-center">
      <p className="text-red-600">Failed to load map: {String(error)}</p>
    </div>
  ),
  component: MapPage,
})

function ShopCard({ shop }: { shop: Shop }) {
  return (
    <button
      className="w-full text-left rounded-xl border border-black/10 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      type="button"
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
          <div className="text-sm text-black/60 truncate">{shop.addr}</div>

          <div className="mt-2 flex flex-wrap gap-2">
            {shop.rating != null ? (
              <span className="text-xs rounded-full bg-black/5 px-2 py-1">
                ⭐ {shop.rating.toFixed(1)}
                {shop.reviewCount != null && shop.reviewCount > 0
                  ? ` (${shop.reviewCount} reviews)`
                  : ""}
              </span>
            ) : null}
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
                Locations ({shops.length})
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