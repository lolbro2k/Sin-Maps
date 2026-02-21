// import { useEffect, useRef } from 'react'
// import L from 'leaflet'
// import type { Map as LeafletMap } from 'leaflet'
// import 'leaflet/dist/leaflet.css'
//
// // Fix marker icons for Vite
// import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
// import markerIcon from 'leaflet/dist/images/marker-icon.png'
// import markerShadow from 'leaflet/dist/images/marker-shadow.png'
//
// delete (L.Icon.Default.prototype as any)._getIconUrl
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: markerIcon2x,
//   iconUrl: markerIcon,
//   shadowUrl: markerShadow,
// })
//
// export default function Map() {
//   const containerRef = useRef<HTMLDivElement | null>(null)
//   const mapRef = useRef<LeafletMap | null>(null)
//
//   useEffect(() => {
//     // React 18 StrictMode runs effects twice in dev — guard against double init
//     if (mapRef.current) return
//     if (!containerRef.current) return
//
//     const map = L.map(containerRef.current).setView([36.1716, -115.1381], 13)
//     mapRef.current = map
//
//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       attribution: '&copy; OpenStreetMap contributors',
//     }).addTo(map)
//
//     return () => {
//       mapRef.current?.remove()
//       mapRef.current = null
//     }
//   }, [])
//
//   return <div ref={containerRef} style={{ height: '100vh', width: '100%' }} />
// }
//
//




import { useEffect, useRef } from "react"
import L from "leaflet"
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix marker icons for Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export type Shop = {
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

type MapProps = {
  shops?: Shop[]
}

export default function Map({ shops = [] }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
const markersRef = useRef<globalThis.Map<string, LeafletMarker>>(
  new globalThis.Map()
)

  // Init map once
  useEffect(() => {
    if (mapRef.current) return
    if (!containerRef.current) return

    const map = L.map(containerRef.current).setView([36.1716, -115.1381], 13)
    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  // Update markers when shops change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nextIds = new Set(shops.map((s) => s.id))

    // Remove markers that are no longer present
    for (const [id, marker] of markersRef.current.entries()) {
      if (!nextIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }

    // Add/update markers
    for (const shop of shops) {
      const existing = markersRef.current.get(shop.id)
      const pos: [number, number] = [shop.lat, shop.lng]

      if (!existing) {
        const marker = L.marker(pos)
          .addTo(map)
          .bindPopup(
            `<b>${shop.name}</b><br/>${shop.address}<br/>${shop.city}${
              shop.rating != null
                ? `<br/>⭐ ${shop.rating}${shop.reviewCount != null ? ` (${shop.reviewCount})` : ""}`
                : ""
            }`
          )

        markersRef.current.set(shop.id, marker)
      } else {
        existing.setLatLng(pos)
      }
    }
  }, [shops])

  // IMPORTANT: use h-full, not 100vh, so it fits your layout and avoids the bottom bar
  return <div ref={containerRef} className="h-full w-full" />
}