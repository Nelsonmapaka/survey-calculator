import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/axios'
import { COORDINATE_SYSTEMS } from '../config/coordinateSystems'
import JoinCalculator from './JoinCalculator'
import PolarCalculator from './PolarCalculator'
import AreaCalculator from './AreaCalculator'
import MapView from './MapView'
import SurveyDiagram from '../components/SurveyDiagram'
import CoordinateConverter from './CoordinateConverter'
import { downloadDXF } from '../utils/dxfExport'
function calculateSegments(pts) {
  if (!pts || pts.length < 2) return []
  const closed = pts.length >= 3
  const segs = []
  for (let i = 0; i < pts.length; i++) {
    const j = closed && i === pts.length - 1 ? 0 : i + 1
    if (j >= pts.length) break
    const dx = pts[j].x - pts[i].x
    const dy = pts[j].y - pts[i].y
    const dist = Math.round(Math.sqrt(dx * dx + dy * dy) * 1000) / 1000
    const br = ((Math.atan2(dy, dx) * 180 / Math.PI) % 360 + 360) % 360
    const d = Math.floor(Math.abs(br)), m = Math.floor((Math.abs(br) - d) * 60), s = Math.round(((Math.abs(br) - d - m / 60) * 3600) * 100) / 100
    segs.push({ from: pts[i], to: pts[j], distance: dist, bearingDMS: `${d}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`, dx: Math.round(dx * 1000) / 1000, dy: Math.round(dy * 1000) / 1000 })
  }
  return segs
}

const TABS = ['Points', 'Join', 'Polar', 'Area', 'Map', 'Diagram', 'Timeline', 'Convert']

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [points, setPoints] = useState([])
  const [activeTab, setActiveTab] = useState('Points')
  const [newPoint, setNewPoint] = useState({ name: '', x: '', y: '' })
  const [error, setError] = useState('')
  const [csvStatus, setCsvStatus] = useState('')
  const [diagramPointIds, setDiagramPointIds] = useState(new Set())
  const [timeline, setTimeline] = useState(() => JSON.parse(localStorage.getItem(`timeline_${id}`) || '[]'))
  const fileRef = useRef()

  const addTimeline = (action, detail) => {
    const entry = { id: Date.now(), ts: new Date().toISOString(), action, detail, user: 'surveyor' }
    const next = [entry, ...timeline].slice(0, 200)
    setTimeline(next)
    localStorage.setItem(`timeline_${id}`, JSON.stringify(next))
  }

  useEffect(() => {
    loadProject()
    loadPoints()
  }, [id])

  useEffect(() => {
    const valid = new Set(points.map(p => p.id))
    setDiagramPointIds(prev => new Set([...prev].filter(id => valid.has(id))))
  }, [points])

  const loadProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`)
      setProject(res.data)
    } catch (err) {
      setError('Project not found')
    }
  }

  const loadPoints = async () => {
    try {
      const res = await api.get(`/projects/${id}/points`)
      setPoints(res.data)
    } catch (err) {
      console.error('Failed to load points')
    }
  }

  const addPoint = async (e) => {
    e.preventDefault()
    if (!newPoint.name || newPoint.x === '' || newPoint.y === '') return
    try {
      await api.post(`/projects/${id}/points`, {
        name: newPoint.name,
        x: parseFloat(newPoint.x),
        y: parseFloat(newPoint.y),
      })
      addTimeline('point_add', `Added point ${newPoint.name} (${parseFloat(newPoint.x)}, ${parseFloat(newPoint.y)})`)
      setNewPoint({ name: '', x: '', y: '' })
      loadPoints()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add point')
    }
  }

  const deletePoint = async (pointId) => {
    if (!confirm('Delete this point?')) return
    try {
      const p = points.find(pt => pt.id === pointId)
      await api.delete(`/projects/${id}/points/${pointId}`)
      if (p) addTimeline('point_del', `Deleted point ${p.name}`)
      loadPoints()
    } catch (err) {
      alert('Failed to delete point')
    }
  }

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvStatus('Parsing CSV...')
    try {
      const text = await file.text()
      let raw = text.replace(/\r/g, '')
      if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1)
      const lines = raw.trim().split('\n')
      if (lines.length < 2) { setCsvStatus('CSV must have a header row and at least one data row'); return }

      const detectSep = (line) => {
        const c = (line.match(/,/g) || []).length
        const s = (line.match(/;/g) || []).length
        const t = (line.match(/\t/g) || []).length
        if (s > c && s > t) return ';'
        if (t > c && t > s) return '\t'
        return ','
      }
      const sep = detectSep(lines[0])
      const parseLine = (line) => line.split(sep).map(c => c.trim().replace(/^['"]+|['"]+$/g, ''))

      const header = parseLine(lines[0].toLowerCase())
      const nameAliases = ['name', 'point', 'pointname', 'point_name', 'point-name', 'label', 'description', 'pt', 'pname']
      const xAliases = ['easting', 'x_coord', 'xcoord', 'x-coord', 'x_coordinate', 'longitude', 'lon', 'lng', 'east', 'x']
      const yAliases = ['northing', 'y_coord', 'ycoord', 'y-coord', 'y_coordinate', 'latitude', 'lat', 'north', 'y']

      const findCol = (aliases) => {
        for (const alias of aliases) {
          const idx = header.findIndex(h => h === alias || h.startsWith(alias) || alias.startsWith(h))
          if (idx !== -1) return idx
        }
        for (const alias of aliases) {
          const idx = header.findIndex(h => h.includes(alias) || alias.includes(h))
          if (idx !== -1) return idx
        }
        return -1
      }
      const nameIdx = findCol(nameAliases)
      const xIdx = findCol(xAliases)
      const yIdx = findCol(yAliases)

      if (nameIdx === -1 || xIdx === -1 || yIdx === -1) {
        setCsvStatus(`Could not find required columns in header: "${lines[0]}". Need columns for point name, X (easting), and Y (northing).`)
        return
      }
      const pts = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i])
        const name = cols[nameIdx]
        const x = parseFloat(cols[xIdx].replace(/[^\d.\-]/g, ''))
        const y = parseFloat(cols[yIdx].replace(/[^\d.\-]/g, ''))
        if (name && !isNaN(x) && !isNaN(y)) pts.push({ name, x, y })
      }
      if (pts.length === 0) { setCsvStatus('No valid points found in CSV'); return }
      const existingNames = new Set(points.map(p => p.name.toLowerCase()))
      const dups = pts.filter(p => existingNames.has(p.name.toLowerCase()))
      if (dups.length > 0) {
        if (!confirm(`${dups.length} duplicate point name(s) found:\n${dups.map(d => d.name).join(', ')}\n\nImport anyway?`)) {
          setCsvStatus('Import cancelled — duplicate names detected')
          return
        }
      }
      setCsvStatus(`Importing ${pts.length} points...`)
      await api.post(`/projects/${id}/points/bulk`, { points: pts })
      addTimeline('csv_import', `Imported ${pts.length} points from CSV${dups.length > 0 ? ` (${dups.length} duplicates ignored)` : ''}`)
      setCsvStatus(`Successfully imported ${pts.length} points!`)
      loadPoints()
      setTimeout(() => setCsvStatus(''), 3000)
    } catch (err) {
      setCsvStatus(err.response?.data?.error || 'CSV import failed')
    }
    e.target.value = ''
  }

  if (error) return <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded">{error}</div>
  if (!project) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>

  const renderTab = () => {
    switch (activeTab) {
      case 'Points':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Manage Points</h3>
            <form onSubmit={addPoint} className="flex flex-wrap gap-3 mb-4">
              <input type="text" placeholder="Point Name" value={newPoint.name}
                onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })} required
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" step="any" placeholder="X (Southing)" value={newPoint.x}
                onChange={(e) => setNewPoint({ ...newPoint, x: e.target.value })} required
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" step="any" placeholder="Y (Westing)" value={newPoint.y}
                onChange={(e) => setNewPoint({ ...newPoint, y: e.target.value })} required
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition">Add Point</button>
            </form>

            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Import CSV:</span>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100" />
                <button onClick={() => {
                  if (points.length === 0) return
                  downloadCSV(['name', 'x', 'y'], points.map(p => ({ name: p.name, x: p.x, y: p.y })), `points_${project.name}.csv`)
                }} disabled={points.length === 0}
                  className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition">
                  Download CSV
                </button>
                <button onClick={() => {
                  if (points.length === 0) return
                  const gj = {
                    type: 'FeatureCollection',
                    name: project.name,
                    crs: { type: 'name', properties: { name: project.coordinate_system } },
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
                  a.download = `${project.name}_qgis.geojson`
                  a.click()
                  URL.revokeObjectURL(a.href)
                }} disabled={points.length === 0}
                  className="text-sm bg-green-700 text-white px-3 py-1.5 rounded hover:bg-green-800 transition disabled:opacity-40">
                  Export GeoJSON (QGIS)
                </button>
                <button onClick={() => {
                  if (points.length === 0) return
                  const segs = calculateSegments(points)
                  downloadDXF(points, segs, project.name)
                }} disabled={points.length === 0}
                  className="text-sm bg-purple-700 text-white px-3 py-1.5 rounded hover:bg-purple-800 transition disabled:opacity-40">
                  Export DXF (CAD)
                </button>
              </div>
              {csvStatus && <p className={`mt-2 text-xs ${csvStatus.includes('Success') ? 'text-green-600 dark:text-green-400' : csvStatus.includes('Importing') ? 'text-blue-600' : 'text-red-600'}`}>{csvStatus}</p>}
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">CSV format: name,x,y (with header row)</p>
            </div>

            {points.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No points added yet.</p>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Diagram selection:</span>
                  <button onClick={() => setDiagramPointIds(new Set(points.map(p => p.id)))}
                    className="text-blue-600 dark:text-blue-400 hover:underline">Select All</button>
                  <span className="text-gray-400">|</span>
                  <button onClick={() => setDiagramPointIds(new Set())}
                    className="text-blue-600 dark:text-blue-400 hover:underline">Clear</button>
                  <span className="ml-2 text-gray-500 dark:text-gray-400">({diagramPointIds.size} of {points.length} selected for diagram)</span>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="text-center p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 w-10">Dgm</th>
                      <th className="text-left p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">X (Southing)</th>
                      <th className="text-left p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Y (Westing)</th>
                      <th className="text-left p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((p, i) => (
                      <tr key={p.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-center">
                          <input type="checkbox" checked={diagramPointIds.has(p.id)} onChange={() => {
                            const next = new Set(diagramPointIds)
                            if (next.has(p.id)) next.delete(p.id); else next.add(p.id)
                            setDiagramPointIds(next)
                          }} className="accent-blue-600" />
                        </td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{p.name}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">{p.x}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">{p.y}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600">
                          <button onClick={() => deletePoint(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )
      case 'Join': return <JoinCalculator points={points} />
      case 'Polar': return <PolarCalculator points={points} projectId={id} onPointAdded={loadPoints} />
      case 'Area': return <AreaCalculator points={points} />
      case 'Map': return <MapView points={points} project={project} projectId={id} onPointAdded={loadPoints} />
      case 'Convert': return <CoordinateConverter points={points} project={project} />
      case 'Diagram': {
        const diagramPoints = diagramPointIds.size > 0 ? points.filter(p => diagramPointIds.has(p.id)) : points
        return diagramPoints.length < 2
          ? <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">Select at least 2 points (via checkboxes in the Points tab) to generate a diagram.</div>
          : <SurveyDiagram points={diagramPoints} project={project} />
      }
      case 'Timeline': {
        const iconMap = { point_add: '●', point_del: '✕', csv_import: '▼' }
        const colorMap = { point_add: 'text-green-600 dark:text-green-400', point_del: 'text-red-600 dark:text-red-400', csv_import: 'text-blue-600 dark:text-blue-400' }
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Survey Activity Timeline</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Records of point additions, deletions, and imports for this project.</p>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {timeline.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No activity recorded yet.</p>}
              {timeline.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className={`text-base font-bold flex-shrink-0 ${colorMap[entry.action] || 'text-gray-500'}`}>{iconMap[entry.action] || '○'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-800 dark:text-gray-200">{entry.detail}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{new Date(entry.ts).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            {timeline.length > 0 && (
              <button onClick={() => { if (confirm('Clear the activity timeline?')) { setTimeline([]); localStorage.removeItem(`timeline_${id}`) } }}
                className="mt-4 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline">Clear timeline</button>
            )}
          </div>
        )
      }
      default: return null
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">&larr; Back to Projects</Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">{project.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {(COORDINATE_SYSTEMS.find(s => s.id === project.coordinate_system)?.name || project.coordinate_system)}
          {project.lo_or_zone && ` — ${project.lo_or_zone}`}
          <span className="ml-4">Points: {points.length}</span>
        </p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors">
        {renderTab()}
      </div>
    </div>
  )
}
