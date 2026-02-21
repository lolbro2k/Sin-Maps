import { createFileRoute } from "@tanstack/react-router"
import { useState, useRef, useCallback } from "react"
import Map, { type Shop } from "../components/map"

// ── Types ────────────────────────────────────────────────────────────────────

type LocationImage = { id: number; name: string; image_url: string | null }
type Review = { review_id: number; review_content: string | null; rating: number | null }
type RiskReport = {
  id: number
  business_name: string
  summary: string | null
  risk_score: number | null
  risk_reason: string | null
}
type LocationDetail = Shop & {
  images: LocationImage[]
  reviews: Review[]
  riskReport: RiskReport | null
}

// ── API helpers ───────────────────────────────────────────────────────────────

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

async function fetchDetail(id: number): Promise<LocationDetail | null> {
  try {
    const res = await fetch(`http://localhost:8000/api/locations/${id}`)
    if (!res.ok) throw new Error(`Server error: ${res.status}`)
    return res.json()
  } catch (e) {
    console.error("Failed to fetch location detail:", e)
    return null
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

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

// ── Risk score badge ──────────────────────────────────────────────────────────

function RiskBadge({ score }: { score: number | null }) {
  if (score == null) return null
  const color =
    score >= 8 ? "bg-red-100 text-red-700 border-red-200" :
    score >= 5 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                 "bg-green-100 text-green-700 border-green-200"
  const label =
    score >= 8 ? "High Risk" :
    score >= 5 ? "Medium Risk" :
                 "Low Risk"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
      {label} ({score}/10)
    </span>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  detail,
  onBack,
}: {
  detail: LocationDetail
  onBack: () => void
}) {
  const [imgIndex, setImgIndex] = useState(0)
  const images = detail.images.filter((i) => i.image_url)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[rgb(250,250,250)] px-4 py-3 border-b border-black/10 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-black/50 hover:text-black transition-colors"
        >
          ← Back
        </button>
        <h2 className="font-semibold truncate flex-1">{detail.name}</h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Image carousel */}
        {images.length > 0 && (
          <div className="relative rounded-xl overflow-hidden bg-black/5 aspect-video">
            <img
              src={images[imgIndex].image_url!}
              alt={images[imgIndex].name}
              className="h-full w-full object-cover"
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImgIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === imgIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImgIndex((p) => (p - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                >‹</button>
                <button
                  type="button"
                  onClick={() => setImgIndex((p) => (p + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                >›</button>
              </>
            )}
          </div>
        )}

        {/* Basic info */}
        <div className="space-y-1">
          {detail.addr && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-black/40 shrink-0">📍</span>
              <span className="text-black/70">{detail.addr}</span>
            </div>
          )}
          {detail.rating != null && (
            <p className="text-sm">
              ⭐ <span className="font-semibold">{detail.rating.toFixed(1)}</span>
              {detail.reviewCount != null && detail.reviewCount > 0
                ? ` · ${detail.reviewCount} review${detail.reviewCount !== 1 ? "s" : ""}`
                : ""}
            </p>
          )}
        </div>

        {/* Risk Report */}
        {detail.riskReport ? (
          <section className="rounded-xl border border-black/10 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">Risk Report</h3>
              <RiskBadge score={detail.riskReport.risk_score} />
            </div>
            {detail.riskReport.summary && (
              <p className="text-sm text-black/70 leading-relaxed">{detail.riskReport.summary}</p>
            )}
            {detail.riskReport.risk_reason && (
              <div className="rounded-lg bg-black/5 px-3 py-2">
                <p className="text-xs font-semibold text-black/50 uppercase tracking-wide mb-1">Reason</p>
                <p className="text-sm text-black/80">{detail.riskReport.risk_reason}</p>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-black/10 bg-white p-4">
            <p className="text-sm text-black/40">No risk report available for this location.</p>
          </section>
        )}

        {/* Reviews */}
        <section className="space-y-3">
          <h3 className="font-semibold text-sm">
            Reviews {detail.reviews.length > 0 ? `(${detail.reviews.length})` : ""}
          </h3>
          {detail.reviews.length === 0 ? (
            <p className="text-sm text-black/40">No reviews yet.</p>
          ) : (
            detail.reviews.map((r) => (
              <div key={r.review_id} className="rounded-xl border border-black/10 bg-white p-3 space-y-1">
                {r.rating != null && (
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < r.rating! ? "text-amber-400" : "text-black/15"}>★</span>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-black">{r.rating}/5</span>
                  </div>
                )}
                {r.review_content && (
                  <p className="text-sm text-black leading-relaxed">{r.review_content}</p>
                )}
              </div>
            ))
          )}
        </section>

      </div>
    </div>
  )
}

// ── List card ─────────────────────────────────────────────────────────────────

function ShopCard({ shop, onClick }: { shop: Shop; onClick: () => void }) {
  return (
    <button
      className="w-full text-left rounded-xl border border-black/10 bg-white shadow-sm hover:shadow-md hover:border-black/20 transition-all overflow-hidden"
      type="button"
      onClick={onClick}
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
          ) : (
            <div className="h-full w-full flex items-center justify-center text-black/20 text-2xl">📍</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-black">{shop.name}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {shop.rating != null ? (
              <span className="text-xs rounded-full bg-black/5 px-2 py-1">
                ⭐ {shop.rating.toFixed(1)}
                {shop.reviewCount != null && shop.reviewCount > 0
                  ? ` (${shop.reviewCount})`
                  : ""}
              </span>
            ) : null}
            <span className="text-xs rounded-full bg-black/5 px-2 py-1 text-black/40">View details →</span>
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SIDEBAR_MIN = 280
const SIDEBAR_MAX = 700
const SIDEBAR_DEFAULT = 380

function MapPage() {
  const { shops } = Route.useLoaderData()
  const [selected, setSelected] = useState<LocationDetail | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = sidebarWidth
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [sidebarWidth])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const delta = startX.current - e.clientX
    const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth.current + delta))
    setSidebarWidth(next)
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  async function handleSelect(shop: Shop) {
    setLoadingId(shop.id)
    const detail = await fetchDetail(shop.id)
    setLoadingId(null)
    if (detail) setSelected(detail)
  }

  return (
    <div
      className="h-[calc(100vh-4rem)] w-full bg-background"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="flex h-full w-full">
        {/* MAP AREA */}
        <div className="relative z-0 flex-1 h-full">
          <Map shops={shops} />
        </div>

        {/* RIGHT SIDEBAR */}
        <aside
          className="relative z-20 h-full bg-[rgb(250,250,250)] border-l border-black/10 shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.08)] flex flex-col"
          style={{ width: sidebarWidth }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onMouseDown}
            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-30 group"
          >
            <div className="h-full w-full bg-transparent group-hover:bg-black/10 transition-colors" />
          </div>

          {/* Detail panel — slides over the list */}
          {selected ? (
            <DetailPanel detail={selected} onBack={() => setSelected(null)} />
          ) : (
            <>
              <div className="sticky top-0 z-10 bg-[rgb(250,250,250)] px-4 py-3 border-b border-black/10 flex items-center justify-between">
                <h2 className="text-base font-semibold">Locations ({shops.length})</h2>
                <span className="text-xs text-black/30 select-none">drag edge to resize</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-1 gap-2.5">
                  {shops.map((s) => (
                    <ShopCard
                      key={s.id}
                      shop={s}
                      onClick={() => handleSelect(s)}
                    />
                  ))}
                  {loadingId != null && (
                    <p className="text-center text-sm text-black/40 py-2">Loading…</p>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}