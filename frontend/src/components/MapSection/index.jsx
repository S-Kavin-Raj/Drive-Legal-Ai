import React, { useEffect, memo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import { Map as MapIcon, Loader2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom DivIcons to render beautiful S and D circle pins without image assets
const srcIcon = L.divIcon({
  html: '<div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-lg">S</div>',
  className: 'custom-map-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const destIcon = L.divIcon({
  html: '<div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-lg">D</div>',
  className: 'custom-map-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

// MapController uses Leaflet's useMap hook to programmatically pan/zoom map to fit route coordinates
function MapController({ activeRoute }) {
  const map = useMap()

  useEffect(() => {
    if (!activeRoute) return
    const srcCoordinates = activeRoute?.sourceCoordinates || activeRoute?.srcCoordinates
    const destCoordinates = activeRoute?.destinationCoordinates || activeRoute?.destCoordinates
    if (!srcCoordinates || !destCoordinates) return

    // Convert ORS [longitude, latitude] to Leaflet [latitude, longitude]
    const srcLatLng = [srcCoordinates[1], srcCoordinates[0]]
    const destLatLng = [destCoordinates[1], destCoordinates[0]]

    const bounds = L.latLngBounds([srcLatLng, destLatLng])
    map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 })
  }, [activeRoute, map])

  return null
}

function MapSection({ activeRoute, loading }) {
  const srcCoordinates = activeRoute?.sourceCoordinates || activeRoute?.srcCoordinates
  const destCoordinates = activeRoute?.destinationCoordinates || activeRoute?.destCoordinates
  const routeGeometry = activeRoute?.routeGeometry || activeRoute?.routeTelemetry?.geometry || activeRoute?.routeGeometry

  // Parse routing polyline coordinates if activeRoute is set
  let polylineCoords = []
  if (routeGeometry) {
    const geom = typeof routeGeometry === 'string' ? JSON.parse(routeGeometry) : routeGeometry

    if (geom?.coordinates) {
      // Support both ORS-style nested arrays [lng, lat] and Firestore-safe objects {lng, lat}
      polylineCoords = geom.coordinates.map((coord) => {
        if (Array.isArray(coord)) {
          return [coord[1], coord[0]]
        }
        if (coord && typeof coord === 'object' && 'lat' in coord && 'lng' in coord) {
          return [coord.lat, coord.lng]
        }
        return null
      }).filter(Boolean)
    }
  }

  const srcLatLng = srcCoordinates
    ? [srcCoordinates[1], srcCoordinates[0]]
    : null

  const destLatLng = destCoordinates
    ? [destCoordinates[1], destCoordinates[0]]
    : null

  return (
    <div className="bg-slate-950 border border-slate-900 rounded-2xl relative min-h-[380px] overflow-hidden flex flex-col">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/80 z-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="animate-spin text-sky-500" size={28} />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pipelining Live Route Vectors...</p>
        </div>
      )}

      {/* React Leaflet MapContainer */}
      <MapContainer
        center={[12.9716, 77.5946]} // Default center at Bangalore coordinates
        zoom={11}
        zoomControl={false} // Custom zoom is handles or default is top-right
        style={{ width: '100%', height: '100%', absolute: 'absolute', inset: 0, minHeight: '380px', zIndex: 10 }}
      >
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Source and Destination Markers */}
        {srcLatLng && <Marker position={srcLatLng} icon={srcIcon} />}
        {destLatLng && <Marker position={destLatLng} icon={destIcon} />}

        {/* Route Polyline Geometry */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            color="#0ea5e9"
            weight={4}
            opacity={0.85}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Dynamic camera pan handler */}
        <MapController activeRoute={activeRoute} />
      </MapContainer>

      {/* Blank/Welcome Screen overlay */}
      {!activeRoute && !loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-slate-500 pointer-events-none p-6 bg-slate-950/90">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-sky-400 w-fit shadow-xl">
            <MapIcon size={22} />
          </div>
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest mt-3">Interactive Vector Map</h4>
          <p className="text-[10px] text-slate-500 max-w-xs text-center mt-1.5 leading-relaxed font-sans">
            Enter a destination above to trace active driving route guidelines on a high-fidelity dark-mode telematics canvas.
          </p>
        </div>
      )}
    </div>
  )
}

export default memo(MapSection)
