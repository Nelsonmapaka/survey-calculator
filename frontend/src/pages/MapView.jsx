import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { MapContainer, Marker, Popup, Polyline, Polygon, TileLayer, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import proj4 from 'proj4'
import api from '../api/axios'
import { getProjection } from '../config/coordinateSystems'

const TILE_Layers = {
  street: { name: 'Street', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap' },
  satellite: { name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
  topo: { name: 'Topo', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
}

function buildProjection(project) {
  if (!project) return null
  const { coordinate_system, lo_or_zone } = project
  if (!coordinate_system) return null
  return getProjection(coordinate_system, lo_or_zone)
}

function convertPoint(projStr, x, y) {
  try {
    const easting = -y
    const northing = x
    const out = proj4(projStr, 'WGS84', [easting, northing])
    if (isFinite(out[0]) && isFinite(out[1]) && Math.abs(out[0]) <= 180 && Math.abs(out[1]) <= 90) {
      return { lat: out[1], lng: out[0] }
    }
    return null
  } catch {
    return null
  }
}

function createMarkerIcon(selected, isFirst) {
  const size = selected ? 16 : 12
  const color = isFirst ? '#dc2626' : selected ? '#2563eb' : '#6b7280'
  const border = isFirst ? '#991b1b' : selected ? '#1e40af' : '#4b5563'
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid ${border};border-radius:50%;cursor:pointer;transition:all 0.2s;"></div>`,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
    popupAnchor: [0, -(size + 4) / 2],
  })
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) onMapClick(e.latlng)
    },
  })
  return null
}

function CoordReadout() {
  const map = useMap()
  const [pos, setPos] = useState(null)
  useEffect(() => {
    const handler = (e) => setPos({ lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) })
    const leave = () => setPos(null)
    map.on('mousemove', handler)
    map.on('mouseout', leave)
    return () => { map.off('mousemove', handler); map.off('mouseout', leave) }
  }, [map])
  return pos ? (
    <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 dark:bg-gray-800/90 text-xs font-mono px-2.5 py-1.5 rounded shadow-sm border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 pointer-events-none">
      Lat: {pos.lat} | Lng: {pos.lng}
    </div>
  ) : null
}

function UTMGrid({ enabled }) {
  const map = useMap()
  const gridRef = useRef(null)
  useEffect(() => {
    if (!enabled) { if (gridRef.current) { gridRef.current.remove(); gridRef.current = null } return }
    const updateGrid = () => {
      if (gridRef.current) gridRef.current.remove()
      const bounds = map.getBounds()
      const zoom = map.getZoom()
      if (zoom < 8) { gridRef.current = null; return }
      const step = zoom < 11 ? 0.1 : zoom < 14 ? 0.05 : 0.01
      const lines = []
      const sw = bounds.getSouthWest(), ne = bounds.getNorthEast()
      const latStart = Math.floor(sw.lat / step) * step
      const lngStart = Math.floor(sw.lng / step) * step
      for (let lat = latStart; lat <= ne.lat; lat += step) {
        lines.push(L.polyline([[lat, sw.lng], [lat, ne.lng]], { color: '#888', weight: 0.5, opacity: 0.4, dashArray: '4 4' }))
      }
      for (let lng = lngStart; lng <= ne.lng; lng += step) {
        lines.push(L.polyline([[sw.lat, lng], [ne.lat, lng]], { color: '#888', weight: 0.5, opacity: 0.4, dashArray: '4 4' }))
      }
      const group = L.layerGroup(lines)
      group.addTo(map)
      gridRef.current = group
    }
    updateGrid()
    map.on('moveend', updateGrid)
    return () => { map.off('moveend', updateGrid); if (gridRef.current) { gridRef.current.remove(); gridRef.current = null } }
  }, [map, enabled])
  return null
}

function FitBounds({ geoPoints }) {
  const map = useMap()
  const fitted = useRef(false)
  const valid = geoPoints.filter(p => p.latlng)
  if (valid.length > 0 && !fitted.current) {
    const bounds = L.latLngBounds(valid.map(p => [p.latlng.lat, p.latlng.lng]))
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] })
      fitted.current = true
    }
  }
  return null
}

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function MapView({ points, project, projectId, onPointAdded, onShowDiagram }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [addMode, setAddMode] = useState(false)
  const [joinResult, setJoinResult] = useState(null)
  const [areaResult, setAreaResult] = useState(null)
  const [newPointName, setNewPointName] = useState('')
  const [tileStyle, setTileStyle] = useState('satellite')
  const [showGrid, setShowGrid] = useState(false)

  const projStr = useMemo(() => buildProjection(project), [project])
  const geoPoints = useMemo(() => {
    if (!projStr) return points.map(p => ({ ...p, latlng: null }))
    return points.map(p => {
      const latlng = convertPoint(projStr, p.x, p.y)
      return { ...p, latlng }
    })
  }, [points, projStr])

  const hasGeo = geoPoints.some(p => p.latlng)
  const defaultCenter = hasGeo ? [geoPoints.find(p => p.latlng).latlng.lat, geoPoints.find(p => p.latlng).latlng.lng] : [0, 0]

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      return [...prev, id]
    })
    setJoinResult(null)
    setAreaResult(null)
  }

  const clearSelection = () => {
    setSelectedIds([])
    setJoinResult(null)
    setAreaResult(null)
  }

  const calcJoin = useCallback(async () => {
    if (selectedIds.length !== 2) return
    const p1 = points.find(p => p.id === selectedIds[0])
    const p2 = points.find(p => p.id === selectedIds[1])
    if (!p1 || !p2) return
    try {
      const res = await api.post('/calculations/join', { points: [p1, p2] })
      setJoinResult(res.data.joins[0])
      setAreaResult(null)
    } catch (_) { }
  }, [selectedIds, points])

  const calcArea = useCallback(async () => {
    if (selectedIds.length < 3) return
    const pts = selectedIds.map(id => points.find(p => p.id === id)).filter(Boolean)
    if (pts.length < 3) return
    try {
      const res = await api.post('/calculations/area', { points: pts })
      setAreaResult(res.data)
      setJoinResult(null)
    } catch (_) { }
  }, [selectedIds, points])

  const handleMapClick = async (latlng) => {
    if (!addMode) return
    if (!newPointName.trim()) { alert('Enter a point name first'); return }
    try {
      await api.post(`/projects/${projectId}/points`, { name: newPointName.trim(), x: latlng.lat, y: latlng.lng })
      setNewPointName('')
      onPointAdded()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add point')
    }
  }

  const selectedPoints = geoPoints.filter(p => selectedIds.includes(p.id))
  const selectedRawPoints = selectedIds.map(id => points.find(p => p.id === id)).filter(Boolean)
  const showJoin = selectedIds.length === 2
  const showPolygon = selectedIds.length >= 3

  if (showJoin && !joinResult) { calcJoin() }
  if (showPolygon && !areaResult) { calcArea() }

  const polylinePositions = selectedPoints.filter(p => p.latlng).map(p => [p.latlng.lat, p.latlng.lng])
  const areaPositions = showPolygon ? [...selectedPoints.filter(p => p.latlng).map(p => [p.latlng.lat, p.latlng.lng])] : []

  const tile = TILE_Layers[tileStyle]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Interactive Map</h3>
          {!hasGeo && projStr && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 rounded">Could not convert coordinates</span>
          )}
          {!projStr && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">No projection data</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded p-0.5">
            {Object.entries(TILE_Layers).map(([key, layer]) => (
              <button key={key} onClick={() => setTileStyle(key)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  tileStyle === key
                    ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {layer.name}
              </button>
            ))}
          </div>
          <button onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              showGrid ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
            }`}>
            {showGrid ? 'Grid ON' : 'Grid'}
          </button>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded px-3 py-1.5">
            <span className="text-xs text-gray-600 dark:text-gray-400">Add Point:</span>
            <input type="text" placeholder="Name" value={newPointName}
              onChange={(e) => setNewPointName(e.target.value)}
              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <button onClick={() => setAddMode(!addMode)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                addMode ? 'bg-green-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}>
              {addMode ? 'Click Map' : 'Off'}
            </button>
          </div>
          {onShowDiagram && selectedIds.length >= 2 && (
            <button onClick={() => onShowDiagram(selectedIds)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition">
              Show on Diagram
            </button>
          )}
          <button onClick={clearSelection}
            className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/50 transition">
            Clear Selection
          </button>
        </div>
      </div>

      <div className="h-[500px] border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative">
        {geoPoints.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
            No points to display. Add points or click "Add Point" mode to place points on the map.
          </div>
        ) : (
          <MapContainer center={defaultCenter} zoom={hasGeo ? 12 : 2} maxZoom={19} className="h-full w-full">
            <TileLayer url={tile.url} attribution={tile.attr} />
            <MapClickHandler onMapClick={handleMapClick} />
            <UTMGrid enabled={showGrid} />
            <CoordReadout />
            {hasGeo && <FitBounds geoPoints={geoPoints} />}

            {showJoin && polylinePositions.length === 2 && (
              <Polyline positions={polylinePositions} color="#2563eb" weight={2} dashArray="6 4" />
            )}

            {showPolygon && areaPositions.length >= 3 && (
              <Polygon positions={areaPositions} color="#dc2626" weight={2} fillColor="#dc2626" fillOpacity={0.1} />
            )}

            {geoPoints.map((p) => {
              if (!p.latlng) return null
              const isSelected = selectedIds.includes(p.id)
              const isFirst = showPolygon && selectedIds.length >= 3 && p.id === selectedIds[0]
              return (
                <Marker key={p.id} position={[p.latlng.lat, p.latlng.lng]} icon={createMarkerIcon(isSelected, isFirst)}
                  eventHandlers={{ click: () => toggleSelect(p.id) }}>
                  <Popup>
                    <div className="text-sm min-w-[160px] dark:text-gray-200">
                      <div className="font-bold text-base mb-1">{p.name}</div>
                      <table className="map-popup-table w-full">
                        <tbody>
                          <tr><td className="text-gray-500 dark:text-gray-400">Lat:</td><td className="text-right font-mono">{p.latlng.lat.toFixed(6)}</td></tr>
                          <tr><td className="text-gray-500 dark:text-gray-400">Lng:</td><td className="text-right font-mono">{p.latlng.lng.toFixed(6)}</td></tr>
                          <tr><td className="text-gray-500 dark:text-gray-400">X (Southing):</td><td className="text-right font-mono">{p.x}</td></tr>
                          <tr><td className="text-gray-500 dark:text-gray-400">Y (Westing):</td><td className="text-right font-mono">{p.y}</td></tr>
                        </tbody>
                      </table>
                      <div className="mt-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {isSelected ? `Selected (#${selectedIds.indexOf(p.id) + 1})` : 'Click to select'}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {showJoin && joinResult && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300">Join Result</h4>
              <button onClick={() => downloadCSV(
                ['From', 'To', 'Distance', 'Bearing', 'DeltaX', 'DeltaY'],
                [{ From: joinResult.from, To: joinResult.to, Distance: joinResult.distance, Bearing: joinResult.bearingDMS, DeltaX: joinResult.dx, DeltaY: joinResult.dy }],
                'map_join.csv'
              )} className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition">Download</button>
            </div>
            <div className="text-sm space-y-1 text-gray-800 dark:text-gray-200">
              <p><span className="text-gray-600 dark:text-gray-400">From:</span> <strong>{joinResult.from}</strong></p>
              <p><span className="text-gray-600 dark:text-gray-400">To:</span> <strong>{joinResult.to}</strong></p>
              <p><span className="text-gray-600 dark:text-gray-400">Distance:</span> <strong>{joinResult.distance} m</strong></p>
              <p><span className="text-gray-600 dark:text-gray-400">Bearing:</span> <strong className="font-mono">{joinResult.bearingDMS}</strong></p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ΔX: {joinResult.dx} m | ΔY: {joinResult.dy} m</p>
            </div>
          </div>
        )}

        {showPolygon && areaResult && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-green-800 dark:text-green-300">Polygon Area</h4>
              <button onClick={() => downloadCSV(
                ['Area_sqm', 'Display'],
                [{ Area_sqm: areaResult.areaSqm, Display: areaResult.display }],
                'map_area.csv'
              )} className="text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition">Download</button>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{areaResult.display}</div>
            {areaResult.areaHa && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{areaResult.areaSqm} m² = {areaResult.areaHa} ha</div>
            )}
            {!areaResult.areaHa && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{areaResult.areaSqm} square meters</div>
            )}
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Polygon: {selectedRawPoints.map(p => p.name).join(' → ')} → {selectedRawPoints[0]?.name}
            </div>
          </div>
        )}

        {selectedIds.length === 1 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Click another point to calculate join. Select 3+ points for area.</p>
          </div>
        )}

        {selectedIds.length >= 3 && !areaResult && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">Calculating area...</p>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedRawPoints.map((p, i) => (
            <span key={p.id} className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
              {i === 0 && selectedIds.length >= 3 && <span className="text-red-500 font-bold">★</span>}
              #{i + 1}: {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
