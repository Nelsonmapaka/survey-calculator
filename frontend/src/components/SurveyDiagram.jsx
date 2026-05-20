import { useState, useMemo } from 'react'
import { COORDINATE_SYSTEMS } from '../config/coordinateSystems'
import { downloadDXF } from '../utils/dxfExport'

function bankersRound(v, d = 3) {
  const m = Math.pow(10, d)
  return Math.round((v + Number.EPSILON) * m) / m
}

function calculateJoin(x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)
  const bearingRad = Math.atan2(dy, dx)
  let bearingDeg = (bearingRad * 180 / Math.PI)
  bearingDeg = ((bearingDeg % 360) + 360) % 360
  const abs = Math.abs(bearingDeg)
  const d = Math.floor(abs)
  const m = Math.floor((abs - d) * 60)
  const s = bankersRound((abs - d - m / 60) * 3600, 2)
  return {
    distance: bankersRound(distance, 3),
    bearingDeg,
    bearingDMS: `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`,
    dx: bankersRound(dx, 3),
    dy: bankersRound(dy, 3),
  }
}

function calculateArea(points) {
  if (points.length < 3) return null
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += points[i].x * points[j].y
    sum -= points[j].x * points[i].y
  }
  const areaSqm = bankersRound(Math.abs(sum) / 2, 3)
  const areaHa = bankersRound(areaSqm / 10000, 4)
  const haStr = `${areaHa.toFixed(4)} ha`
  const smStr = `${areaSqm.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m²`
  return { areaSqm, areaHa, display: `${haStr} (${smStr})`, displayHa: haStr, displaySm: smStr }
}

function toDMS(deg) {
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const m = Math.floor((abs - d) * 60)
  const s = bankersRound((abs - d - m / 60) * 3600, 2)
  return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`
}

function downloadGeoJSON(points, project) {
  const gj = {
    type: 'FeatureCollection',
    name: project?.name || 'survey',
    crs: { type: 'name', properties: { name: project?.coordinate_system || 'local' } },
    features: points.map((p, i) => ({
      type: 'Feature',
      id: p.id,
      properties: { name: p.name, point_no: i + 1 },
      geometry: { type: 'Point', coordinates: [p.y, p.x] },
    })),
  }
  const blob = new Blob([JSON.stringify(gj, null, 2)], { type: 'application/geo+json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${project?.name || 'survey'}_diagram.qgis.geojson`
  a.click()
  URL.revokeObjectURL(a.href)
}

const DEFAULT_BEACON_TYPES = ['B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.',
  'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.',
  'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.', 'B.P.']

export default function SurveyDiagram({ points, project }) {
  const [owner, setOwner] = useState('')
  const [surveyor, setSurveyor] = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [firm, setFirm] = useState('')
  const [refNo, setRefNo] = useState('')
  const [parcelNo, setParcelNo] = useState('')
  const [location, setLocation] = useState('')
  const [adjoiningOwners, setAdjoiningOwners] = useState('')
  const [features, setFeatures] = useState('')
  const [notes, setNotes] = useState('')
  const [scale, setScale] = useState('1000')

  const [diagramNo, setDiagramNo] = useState('')
  const [sheet, setSheet] = useState('1')
  const [totalSheets, setTotalSheets] = useState('1')
  const [surveyDate, setSurveyDate] = useState('')
  const [magDeclination, setMagDeclination] = useState('')
  const [measurementMethod, setMeasurementMethod] = useState('')
  const [compilationMethod, setCompilationMethod] = useState('')
  const [beaconTypesRaw, setBeaconTypesRaw] = useState('')
  const [adjoiningDiagrams, setAdjoiningDiagrams] = useState('')
  const [covenants, setCovenants] = useState('')
  const [accuracy, setAccuracy] = useState('')
  const [examiner, setExaminer] = useState('')
  const [examinerDate, setExaminerDate] = useState('')

  const beaconTypes = useMemo(() => {
    if (!beaconTypesRaw) return DEFAULT_BEACON_TYPES
    const arr = beaconTypesRaw.split(',').map(s => s.trim())
    const result = []
    for (let i = 0; i < Math.max(points.length, arr.length); i++) {
      result.push(arr[i] || DEFAULT_BEACON_TYPES[i] || 'B.P.')
    }
    return result
  }, [beaconTypesRaw, points])

  const diagramData = useMemo(() => {
    if (!points || points.length < 2) return null
    const closed = points.length >= 3
    const segments = []
    for (let i = 0; i < points.length; i++) {
      const j = closed && i === points.length - 1 ? 0 : i + 1
      if (j >= points.length) break
      const join = calculateJoin(points[i].x, points[i].y, points[j].x, points[j].y)
      segments.push({ from: points[i], to: points[j], ...join })
    }
    const area = closed ? calculateArea(points) : null
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const pad = Math.max(rangeX, rangeY) * 0.12
    return { segments, area, bounds: { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad } }
  }, [points])

  if (!diagramData || points.length < 2) return <div className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">Need at least 2 points to generate a diagram.</div>

  const { segments, area } = diagramData
  const sysName = project ? (COORDINATE_SYSTEMS.find(s => s.id === project.coordinate_system)?.name || project.coordinate_system) : ''

  const rangeX = diagramData.bounds.maxX - diagramData.bounds.minX || 1
  const rangeY = diagramData.bounds.maxY - diagramData.bounds.minY || 1

  // LAYOUT
  const vw = 1200
  const vh = 960

  const drL = 15, drT = 90, drW = 575, drH = 535
  const rtL = 600, rtW1 = 285, rtW2 = 305
  const rtT = drT

  const sc = Math.min(drW / rangeX, drH / rangeY) * 0.92
  const scOx = drL + (drW - rangeX * sc) / 2
  const scOy = drT + (drH - rangeY * sc) / 2
  const toSvg = (x, y) => [(x - diagramData.bounds.minX) * sc + scOx, (diagramData.bounds.maxY - y) * sc + scOy]

  const adjOwnersList = adjoiningOwners.split(',').map(s => s.trim()).filter(Boolean)
  const adjDiagramsList = adjoiningDiagrams.split(',').map(s => s.trim()).filter(Boolean)
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3 no-print">
        <button onClick={() => downloadGeoJSON(points, project)}
          className="bg-green-700 text-white px-3 py-1.5 rounded text-xs hover:bg-green-800 transition">Export GeoJSON (QGIS)</button>
        <button onClick={() => downloadDXF(points, segments, project?.name || 'survey')}
          className="bg-purple-700 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-800 transition">Export DXF (CAD)</button>
        <button onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition">Print / Save PDF</button>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { size: A3 landscape; margin: 5mm; }
          .diagram-svg svg { width: 100%; height: 100%; }
        }
      `}</style>

      <div className="grid grid-cols-4 gap-3 mb-4 text-xs no-print">
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Owner / Client</label><input value={owner} onChange={e => setOwner(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Surveyor</label><input value={surveyor} onChange={e => setSurveyor(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">License No.</label><input value={licenseNo} onChange={e => setLicenseNo(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Firm</label><input value={firm} onChange={e => setFirm(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Reference No.</label><input value={refNo} onChange={e => setRefNo(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Diagram No.</label><input value={diagramNo} onChange={e => setDiagramNo(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="flex gap-2"><div className="flex-1"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Sheet</label><input value={sheet} onChange={e => setSheet(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
          <div className="flex-1"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">of</label><input value={totalSheets} onChange={e => setTotalSheets(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Survey Date</label><input type="date" value={surveyDate} onChange={e => setSurveyDate(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Parcel / Plot No.</label><input value={parcelNo} onChange={e => setParcelNo(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Location (Town/District)</label><input value={location} onChange={e => setLocation(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Magnetic Declination</label><input value={magDeclination} onChange={e => setMagDeclination(e.target.value)} placeholder="e.g. 8°30'W" className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Scale 1:</label><input value={scale} onChange={e => setScale(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Measurement Method</label><select value={measurementMethod} onChange={e => setMeasurementMethod(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
          <option value="">-- Select --</option><option value="GPS RTK">GPS RTK</option><option value="GPS Static">GPS Static</option>
          <option value="Total Station">Total Station</option><option value="Steel Tape">Steel Tape</option>
          <option value="Combined">Combined Methods</option><option value="Photogrammetry">Photogrammetry</option>
        </select></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Compilation Method</label><select value={compilationMethod} onChange={e => setCompilationMethod(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
          <option value="">-- Select --</option><option value="COGO">COGO</option><option value="Least Squares">Least Squares</option>
          <option value="CAD">CAD</option><option value="Manual">Manual Computation</option>
        </select></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Accuracy / Precision</label><input value={accuracy} onChange={e => setAccuracy(e.target.value)} placeholder="e.g. ±0.05 m" className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="col-span-2"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Beacon Types (comma-separated, in point order)</label><input value={beaconTypesRaw} onChange={e => setBeaconTypesRaw(e.target.value)} placeholder="Iron Pin, Concrete Beacon, Steel Pipe, ..." className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="col-span-2"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Adjoining Owners</label><input value={adjoiningOwners} onChange={e => setAdjoiningOwners(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="col-span-2"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Reference Diagrams (SG Nos, comma-separated)</label><input value={adjoiningDiagrams} onChange={e => setAdjoiningDiagrams(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="col-span-2"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Covenants / Servitudes / Restrictions</label><input value={covenants} onChange={e => setCovenants(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="col-span-2"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Topographical Features</label><input value={features} onChange={e => setFeatures(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="col-span-2"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Examiner</label><input value={examiner} onChange={e => setExaminer(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Examiner Date</label><input type="date" value={examinerDate} onChange={e => setExaminerDate(e.target.value)} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
        <div className="col-span-4"><label className="block text-gray-600 dark:text-gray-400 mb-0.5">Notes / Remarks</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border px-2 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" /></div>
      </div>

      <div className="bg-white border border-gray-300 shadow-sm diagram-svg" style={{ maxWidth: '100%', overflow: 'auto' }}>
        <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" style={{ minWidth: 1000 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#333" />
            </marker>
            <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="#ddd" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* === PAGE BORDER === */}
          <rect x="2" y="2" width={vw - 4} height={vh - 4} fill="white" stroke="#111" strokeWidth="2" />
          <rect x="6" y="6" width={vw - 12} height={vh - 12} fill="none" stroke="#666" strokeWidth="0.5" />

          {/* ================================================================
              SECTION 1: TOP HEADER (0-85)
          ================================================================ */}

          {/* Top bar */}
          <rect x="8" y="8" width={vw - 16} height="18" fill="#f0f0f0" stroke="#333" strokeWidth="0.8" />
          <text x="18" y="20" fontSize="8" fontFamily="Arial" fill="#333">DIAGRAM No.: {diagramNo || '_______________'}</text>
          <text x="320" y="20" fontSize="8" fontFamily="Arial" fill="#333">SHEET: {sheet || '_'} of {totalSheets || '_'}</text>
          <text x="520" y="20" fontSize="8" fontFamily="Arial" fill="#333">DATE: {surveyDate || dateStr}</text>
          <text x={vw - 160} y="20" fontSize="8" fontFamily="Arial" fill="#333">SCALE 1:{scale || '______'}</text>

          {/* Title block */}
          <text x={vw / 2} y="46" textAnchor="middle" fontSize="20" fontWeight="bold" fontFamily="Arial" fill="#111">SURVEY DIAGRAM</text>
          <text x={vw / 2} y="62" textAnchor="middle" fontSize="11" fontFamily="Arial" fill="#333">{project?.name || ''}</text>
          <line x1="10" y1="68" x2={vw - 10} y2="68" stroke="#999" strokeWidth="0.5" />
          <text x={vw / 2} y="80" textAnchor="middle" fontSize="8" fill="#555" fontFamily="Arial">
            Coordinate System: {sysName}{project?.lo_or_zone ? ` — ${project.lo_or_zone}` : ''} | Units: metres | Bearings in degrees-minutes-seconds
          </text>

          {/* Left info */}
          {owner && <text x="18" y="46" fontSize="8" fontFamily="Arial" fill="#333">Owner/Client: {owner}</text>}
          {parcelNo && <text x="18" y="58" fontSize="8" fontFamily="Arial" fill="#333">Parcel/Plot: {parcelNo}</text>}
          {location && <text x="18" y="70" fontSize="8" fontFamily="Arial" fill="#333">Location: {location}</text>}

          {/* Right info */}
          {surveyor && <text x={vw - 18} y="46" textAnchor="end" fontSize="8" fontFamily="Arial" fill="#333">Surveyor: {surveyor}</text>}
          {licenseNo && <text x={vw - 18} y="58" textAnchor="end" fontSize="8" fontFamily="Arial" fill="#333">License: {licenseNo}</text>}
          {firm && <text x={vw - 18} y="70" textAnchor="end" fontSize="8" fontFamily="Arial" fill="#333">Firm: {firm}</text>}
          {refNo && <text x={vw - 18} y="82" textAnchor="end" fontSize="8" fontFamily="Arial" fill="#333">Ref: {refNo}</text>}

          {/* ================================================================
              SECTION 2: PLAN VIEW + RIGHT TABLES (90-625)
          ================================================================ */}

          {/* --- Drawing Area --- */}
          <rect x={drL} y={drT} width={drW} height={drH} fill="#fafafa" stroke="#333" strokeWidth="1" />
          <text x={drL + 6} y={drT + 13} fontSize="7.5" fill="#999" fontFamily="Arial" fontStyle="italic">PLAN VIEW</text>

          {/* Cross-hatch inside drawing (subtle) */}
          <rect x={drL} y={drT} width={drW} height={drH} fill="url(#hatch)" opacity="0.15" />

          {/* Draw beacons and lines */}
          {segments.map((seg, i) => {
            const [x1, y1] = toSvg(seg.from.x, seg.from.y)
            const [x2, y2] = toSvg(seg.to.x, seg.to.y)
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
            const perpAngle = angle + 90
            const off = 14
            const nx = Math.cos(perpAngle * Math.PI / 180) * off
            const ny = Math.sin(perpAngle * Math.PI / 180) * off
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a1a1a" strokeWidth="2" />
                <circle cx={x1} cy={y1} r="4" fill="white" stroke="#111" strokeWidth="1.5" />
                <circle cx={x1} cy={y1} r="1.5" fill="#111" />
                <text x={x1} y={y1 - 11} textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#111" fontFamily="Arial">{seg.from.name}</text>
                <rect x={mx + nx - 30} y={my + ny - 6} width={60} height={11} fill="white" fillOpacity="0.88" rx="2" stroke="#ccc" strokeWidth="0.3" />
                <text x={mx + nx} y={my + ny + 3} textAnchor="middle" fontSize="7" fill="#222" fontFamily="'Courier New', monospace" fontWeight="bold">{seg.distance} m</text>
                <rect x={mx - nx - 34} y={my - ny - 6} width={68} height={11} fill="white" fillOpacity="0.88" rx="2" stroke="#ccc" strokeWidth="0.3" />
                <text x={mx - nx} y={my - ny + 3} textAnchor="middle" fontSize="7" fill="#555" fontFamily="'Courier New', monospace">{seg.bearingDMS}</text>
              </g>
            )
          })}

          {/* Closing line */}
          {area && points.length >= 3 && (() => {
            const last = points[points.length - 1]; const first = points[0]
            const [lx, ly] = toSvg(last.x, last.y); const [fx, fy] = toSvg(first.x, first.y)
            return <line x1={lx} y1={ly} x2={fx} y2={fy} stroke="#1a1a1a" strokeWidth="2" />
          })()}

          {/* Adjoining owner labels on diagram */}
          {adjOwnersList.map((name, i) => {
            if (i >= segments.length) return null
            const seg = segments[i]
            const [x1, y1] = toSvg(seg.from.x, seg.from.y)
            const [x2, y2] = toSvg(seg.to.x, seg.to.y)
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
            const perpAngle = angle - 90
            const off = 28
            const nx = Math.cos(perpAngle * Math.PI / 180) * off
            const ny = Math.sin(perpAngle * Math.PI / 180) * off
            return (
              <text key={i} x={mx + nx} y={my + ny + 3} textAnchor="middle" fontSize="6.5" fill="#666" fontFamily="Arial" fontStyle="italic">{name}</text>
            )
          })}

          {/* Dual North Arrow (True + Magnetic) */}
          <g transform={`translate(${drL + drW - 50}, ${drT + 28})`}>
            <circle cx="0" cy="0" r="26" fill="none" stroke="#333" strokeWidth="0.5" />
            {/* True North */}
            <line x1="0" y1="20" x2="0" y2="-18" stroke="#333" strokeWidth="1.2" />
            <polygon points="-5,6 0,-18 5,6" fill="#111" />
            <polygon points="-4,6 0,-15 4,6" fill="white" stroke="#111" strokeWidth="0.8" />
            <text x="0" y="-24" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial" fill="#111">N</text>
            <text x="0" y="34" textAnchor="middle" fontSize="5" fill="#999" fontFamily="Arial">TRUE NORTH</text>
            {/* Magnetic North */}
            {magDeclination && (() => {
              const match = magDeclination.match(/([\d.]+)/)
              const decVal = match ? parseFloat(match[1]) : 0
              const isWest = magDeclination.toUpperCase().includes('W')
              const angle = isWest ? decVal : -decVal
              const rad = angle * Math.PI / 180
              const len = 14
              const mx2 = Math.sin(rad) * len
              const my2 = Math.cos(rad) * len
              return (
                <g>
                  <line x1={-mx2} y1={20 - my2} x2={mx2} y2={-my2} stroke="#c00" strokeWidth="0.8" strokeDasharray="2 2" />
                  <text x={mx2 + 3} y={-my2 + 3} fontSize="6" fill="#c00" fontFamily="Arial" fontStyle="italic">MN</text>
                  <text x={mx2 > 0 ? -40 : 3} y={26} fontSize="5.5" fill="#c00" fontFamily="Arial">Mag. Dec. {magDeclination}</text>
                </g>
              )
            })()}
          </g>

          {/* === RIGHT COLUMN 1: BEACON DESCRIPTION + COORDINATES === */}
          <g transform={`translate(${rtL}, ${rtT})`}>
            <rect x="0" y="0" width={rtW1} height={drH} fill="none" stroke="#333" strokeWidth="1" />
            <rect x="0" y="0" width={rtW1} height="18" fill="#e8e8e8" stroke="#333" strokeWidth="1" />
            <text x={rtW1 / 2} y="13" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="Arial">BEACON SCHEDULE &amp; COORDINATES</text>

            {/* Column headers */}
            <text x="5" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">#</text>
            <text x="20" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">Name</text>
            <text x="70" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">Description</text>
            <text x="150" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">X (South)</text>
            <text x="220" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">Y (West)</text>
            <line x1="2" y1="37" x2={rtW1 - 2} y2="37" stroke="#999" strokeWidth="0.6" />

            {points.slice(0, 22).map((p, i) => (
              <g key={p.id}>
                <line x1="2" y1={40 + i * 15} x2={rtW1 - 2} y2={40 + i * 15} stroke={i > 0 ? "#eee" : "#eee"} strokeWidth="0.5" />
                <text x="5" y={51 + i * 15} fontSize="6.5" fontFamily="Arial">{i + 1}</text>
                <text x="20" y={51 + i * 15} fontSize="6.5" fontWeight="bold" fontFamily="Arial">{p.name}</text>
                <text x="70" y={51 + i * 15} fontSize="6" fontFamily="Arial">{beaconTypes[i] || 'B.P.'}</text>
                <text x="150" y={51 + i * 15} fontSize="6.5" fontFamily="'Courier New', monospace">{bankersRound(p.x, 3)}</text>
                <text x="220" y={51 + i * 15} fontSize="6.5" fontFamily="'Courier New', monospace">{bankersRound(p.y, 3)}</text>
              </g>
            ))}
            {points.length > 22 && <text x={rtW1 / 2} y={51 + 22 * 15} textAnchor="middle" fontSize="6" fill="#999" fontFamily="Arial">({points.length - 22} more points — see continuation sheet)</text>}
          </g>

          {/* === RIGHT COLUMN 2: LINE MEASUREMENTS === */}
          <g transform={`translate(${rtL + rtW1 + 5}, ${rtT})`}>
            <rect x="0" y="0" width={rtW2} height={drH} fill="none" stroke="#333" strokeWidth="1" />
            <rect x="0" y="0" width={rtW2} height="18" fill="#e8e8e8" stroke="#333" strokeWidth="1" />
            <text x={rtW2 / 2} y="13" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="Arial">LINE MEASUREMENTS</text>

            <text x="5" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">#</text>
            <text x="25" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">From → To</text>
            <text x="120" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">Bearing</text>
            <text x="210" y="34" fontSize="7" fontWeight="bold" fill="#444" fontFamily="Arial">Dist (m)</text>
            <line x1="2" y1="37" x2={rtW2 - 2} y2="37" stroke="#999" strokeWidth="0.6" />

            {segments.slice(0, 30).map((seg, i) => (
              <g key={i}>
                <line x1="2" y1={40 + i * 16} x2={rtW2 - 2} y2={40 + i * 16} stroke={i > 0 ? "#eee" : "#eee"} strokeWidth="0.5" />
                <text x="5" y={51 + i * 16} fontSize="6.5" fontFamily="Arial">{i + 1}</text>
                <text x="25" y={51 + i * 16} fontSize="6.5" fontFamily="Arial">{seg.from.name} → {seg.to.name}</text>
                <text x="120" y={51 + i * 16} fontSize="6.5" fontFamily="'Courier New', monospace">{seg.bearingDMS}</text>
                <text x="210" y={51 + i * 16} fontSize="6.5" fontFamily="'Courier New', monospace">{seg.distance}</text>
              </g>
            ))}
            {segments.length > 30 && <text x={rtW2 / 2} y={51 + 30 * 16} textAnchor="middle" fontSize="6" fill="#999" fontFamily="Arial">({segments.length - 30} more lines — see continuation sheet)</text>}
          </g>

          {/* ================================================================
              SECTION 3: AREA + COMPILATION + MEASUREMENT METHOD (630-680)
          ================================================================ */}
          <g transform={`translate(${drL}, 630)`}>
            <rect x="0" y="0" width={vw - 30} height="50" fill="none" stroke="#333" strokeWidth="1" />
            <rect x="0" y="0" width={vw - 30} height="16" fill="#e8e8e8" stroke="#333" strokeWidth="1" />
            <text x={(vw - 30) / 2} y="12" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial">AREA &amp; COMPUTATION INFORMATION</text>

            {/* Area - prominent */}
            {area && <text x="12" y="38" fontSize="11" fontWeight="bold" fontFamily="Arial" fill="#111">AREA: {area.display}</text>}
            {!area && <text x="12" y="38" fontSize="10" fontFamily="Arial" fill="#888">AREA: (open traverse — no area computed)</text>}

            {/* Compilation method */}
            {compilationMethod && <text x="380" y="32" fontSize="7.5" fontFamily="Arial" fill="#444">Compiled by: {compilationMethod}</text>}
            {measurementMethod && <text x="380" y="44" fontSize="7.5" fontFamily="Arial" fill="#444">Measured by: {measurementMethod}</text>}
            {accuracy && <text x="620" y="32" fontSize="7.5" fontFamily="Arial" fill="#444">Accuracy: {accuracy}</text>}
            {surveyDate && <text x="620" y="44" fontSize="7.5" fontFamily="Arial" fill="#444">Survey Date: {surveyDate}</text>}
          </g>

          {/* ================================================================
              SECTION 4: SCALE + LEGEND + ADJOINING (685-770)
          ================================================================ */}
          <g transform={`translate(${drL}, 685)`}>
            <rect x="0" y="0" width={vw - 30} height="85" fill="none" stroke="#333" strokeWidth="1" />
            <rect x="0" y="0" width={vw - 30} height="16" fill="#e8e8e8" stroke="#333" strokeWidth="1" />
            <text x={(vw - 30) / 2} y="12" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial">SCALE, LEGEND &amp; REFERENCE INFORMATION</text>

            {/* SCALE BAR */}
            <text x="12" y="34" fontSize="7.5" fontWeight="bold" fontFamily="Arial">SCALE 1:{scale}</text>
            <line x1="12" y1="44" x2="232" y2="44" stroke="#333" strokeWidth="2" />
            {[0, 1, 2, 3, 4, 5].map((t, i) => {
              const px = 44 * t
              const scVal = Math.round(parseInt(scale) * 44 / 1000) * t
              return (
                <g key={i}>
                  <rect x={px + 12} y="38" width="22" height="6" fill={i % 2 === 0 ? '#333' : 'white'} stroke="#333" strokeWidth="0.5" />
                  {t < 6 && <line x1={px + 12} y1="50" x2={px + 12} y2="56" stroke="#333" strokeWidth="0.8" />}
                  <text x={px + 12} y="64" textAnchor="middle" fontSize="6.5" fontFamily="Arial">{scVal}</text>
                </g>
              )
            })}
            <text x="132" y="74" textAnchor="middle" fontSize="6.5" fill="#555" fontFamily="Arial">metres</text>

            {/* LEGEND */}
            <text x="290" y="34" fontSize="7.5" fontWeight="bold" fontFamily="Arial">LEGEND</text>
            <circle cx="294" cy="44" r="3" fill="white" stroke="#111" strokeWidth="1" />
            <circle cx="294" cy="44" r="1.2" fill="#111" />
            <text x="302" y="47" fontSize="6.5" fontFamily="Arial" fill="#555">Survey beacon / boundary peg (●)</text>
            <line x1="294" y1="56" x2="314" y2="56" stroke="#1a1a1a" strokeWidth="2" />
            <text x="320" y="59" fontSize="6.5" fontFamily="Arial" fill="#555">Boundary line</text>
            <text x="290" y="72" fontSize="6.5" fontFamily="Arial" fill="#555">• {area ? 'Closed polygon (cadastral)' : 'Open traverse'}</text>

            {/* ABBREVIATIONS */}
            <text x="490" y="34" fontSize="7.5" fontWeight="bold" fontFamily="Arial">ABBREVIATIONS</text>
            <text x="492" y="47" fontSize="6" fontFamily="Arial" fill="#555">B.P. = Boundary Peg</text>
            <text x="492" y="57" fontSize="6" fontFamily="Arial" fill="#555">C.B. = Concrete Beacon</text>
            <text x="492" y="67" fontFamily="Arial" fill="#555">I.P. = Iron Pin / Iron Peg</text>
            <text x="492" y="77" fontSize="6" fontFamily="Arial" fill="#555">S.P. = Steel Pipe / Steel Peg</text>

            {/* ADJOINING PROPERTIES */}
            <text x="680" y="34" fontSize="7.5" fontWeight="bold" fontFamily="Arial">ADJOINING PROPERTIES</text>
            {adjOwnersList.length > 0 && adjOwnersList.slice(0, 4).map((name, i) => (
              <text key={i} x="682" y={47 + i * 10} fontSize="6.5" fontFamily="Arial" fill="#444">{i + 1}. {name}</text>
            ))}
            {adjOwnersList.length === 0 && <text x="682" y="47" fontSize="6" fontFamily="Arial" fill="#999">(none specified)</text>}

            {/* REFERENCE DIAGRAMS */}
            {adjDiagramsList.length > 0 && (
              <>
                <text x="900" y="34" fontSize="7.5" fontWeight="bold" fontFamily="Arial">REFERENCE DIAGRAMS</text>
                {adjDiagramsList.slice(0, 3).map((ref, i) => (
                  <text key={i} x="902" y={47 + i * 10} fontSize="6.5" fontFamily="Arial" fill="#444">{i + 1}. SG Diag {ref}</text>
                ))}
              </>
            )}

            {/* COVENANTS */}
            {covenants && (
              <>
                <text x="900" y={adjDiagramsList.length > 0 ? 80 : 47} fontSize="7.5" fontWeight="bold" fontFamily="Arial">COVENANTS / SERVITUDES</text>
                <text x="902" y={adjDiagramsList.length > 0 ? 90 : 57} fontSize="6" fontFamily="Arial" fill="#c44">{covenants.length > 80 ? covenants.slice(0, 77) + '...' : covenants}</text>
              </>
            )}
          </g>

          {/* ================================================================
              SECTION 5: CERTIFICATION (775-840)
          ================================================================ */}
          <g transform={`translate(${drL}, 775)`}>
            <rect x="0" y="0" width={vw - 30} height="65" fill="none" stroke="#333" strokeWidth="1" />
            <rect x="0" y="0" width={vw - 30} height="16" fill="#e8e8e8" stroke="#333" strokeWidth="1" />
            <text x={(vw - 30) / 2} y="12" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial">CERTIFICATION</text>

            {/* Surveyor Certification */}
            <text x="12" y="32" fontSize="7" fontFamily="Arial" fill="#333">
              I hereby certify that this diagram is a correct representation of the survey executed by me
            </text>
            <text x="12" y="44" fontSize="7" fontFamily="Arial" fill="#333">
              in accordance with the requirements of the Land Survey Act and Regulations, and that all
            </text>
            <text x="12" y="56" fontSize="7" fontFamily="Arial" fill="#333">
              measurements and computations are accurate and true to the best of my knowledge and belief.
            </text>
          </g>

          {/* ================================================================
              SECTION 6: SIGNATURES + DATES + STAMPS (845-920)
          ================================================================ */}
          <g transform={`translate(${drL}, 845)`}>
            <rect x="0" y="0" width={vw - 30} height="70" fill="none" stroke="#333" strokeWidth="1" />
            <rect x="0" y="0" width={vw - 30} height="16" fill="#e8e8e8" stroke="#333" strokeWidth="1" />
            <text x={(vw - 30) / 2} y="12" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial">SIGNATORIES &amp; OFFICIAL STAMPS</text>

            {/* Surveyor signature */}
            <text x="12" y="32" fontSize="7.5" fontWeight="bold" fontFamily="Arial" fill="#333">SURVEYOR:</text>
            <text x="80" y="32" fontSize="7.5" fontFamily="Arial" fill="#333">{surveyor || '___________________________'}</text>
            <line x1="80" y1="30" x2="260" y2="30" stroke="#333" strokeWidth="0.5" />
            <text x="80" y="42" fontSize="6" fill="#999" fontFamily="Arial">Signature</text>

            <text x="280" y="32" fontSize="7.5" fontWeight="bold" fontFamily="Arial" fill="#333">LICENSE:</text>
            <text x="330" y="32" fontSize="7.5" fontFamily="Arial" fill="#333">{licenseNo || '_______________'}</text>

            <text x="460" y="32" fontSize="7.5" fontWeight="bold" fontFamily="Arial" fill="#333">DATE:</text>
            <text x="500" y="32" fontSize="7.5" fontFamily="Arial" fill="#333">{surveyDate || dateStr}</text>

            {/* Examiner signature */}
            <text x="12" y="58" fontSize="7.5" fontWeight="bold" fontFamily="Arial" fill="#333">EXAMINER:</text>
            <text x="80" y="58" fontSize="7.5" fontFamily="Arial" fill="#333">{examiner || '___________________________'}</text>
            <line x1="80" y1="56" x2="260" y2="56" stroke="#333" strokeWidth="0.5" />
            <text x="80" y="68" fontSize="6" fill="#999" fontFamily="Arial">Signature</text>
            <text x="280" y="58" fontSize="7.5" fontWeight="bold" fontFamily="Arial" fill="#333">DATE:</text>
            <text x="320" y="58" fontSize="7.5" fontFamily="Arial" fill="#333">{examinerDate || '_______________'}</text>

            {/* SG Office Block */}
            <rect x={vw - 260} y="20" width="230" height="45" fill="none" stroke="#999" strokeWidth="0.8" strokeDasharray="4 3" />
            <text x={vw - 145} y="36" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#666" fontFamily="Arial">SURVEYOR GENERAL'S OFFICE</text>
            <line x1={vw - 250} y1="44" x2={vw - 40} y2="44" stroke="#ccc" strokeWidth="0.5" />
            <text x={vw - 145} y="53" textAnchor="middle" fontSize="6" fill="#999" fontFamily="Arial">Examined / Approved</text>
            <text x={vw - 145} y="62" textAnchor="middle" fontSize="6" fill="#999" fontFamily="Arial">Signature: _________________ Date: ________</text>
          </g>

          {/* ================================================================
              SECTION 7: FOOTER
          ================================================================ */}
          <text x={vw / 2} y={vh - 8} textAnchor="middle" fontSize="6" fill="#bbb" fontFamily="Arial">
            Generated by Survey Calculator | {dateStr} | Units: metres | Bearings: DMS
          </text>

        </svg>
      </div>
    </div>
  )
}
