import { useState } from 'react'
import api from '../api/axios'

const MODES = ['Single', 'Radial', 'Sequential']

function DMSInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <input type="number" value={value.degrees} onChange={(e) => onChange({ ...value, degrees: parseInt(e.target.value) || 0 })}
        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="°" />
      <span className="text-xs text-gray-500">°</span>
      <input type="number" value={value.minutes} onChange={(e) => onChange({ ...value, minutes: parseInt(e.target.value) || 0 })}
        min="0" max="59"
        className="w-14 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="'" />
      <span className="text-xs text-gray-500">'</span>
      <input type="number" step="any" value={value.seconds} onChange={(e) => onChange({ ...value, seconds: parseFloat(e.target.value) || 0 })}
        min="0" max="59.999"
        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder='"' />
      <span className="text-xs text-gray-500">"</span>
    </div>
  )
}

function emptyBearing() { return { degrees: 0, minutes: 0, seconds: 0 } }

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function PolarCalculator({ points, projectId, onPointAdded }) {
  const [mode, setMode] = useState('Single')
  const [origin, setOrigin] = useState('')
  const [bearing, setBearing] = useState(emptyBearing())
  const [distance, setDistance] = useState('')
  const [measurements, setMeasurements] = useState([])
  const [segments, setSegments] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const reset = () => { setResults(null); setError('') }

  const handleSingle = async () => {
    if (!origin) { setError('Select origin point'); return }
    if (!distance) { setError('Enter distance'); return }
    reset()
    const o = points.find(p => p.id === parseInt(origin))
    const bearingDeg = bearing.degrees + bearing.minutes / 60 + bearing.seconds / 3600
    try {
      const res = await api.post('/calculations/polar', { origin: o, bearingDeg, distance: parseFloat(distance) })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
  }

  const addMeasurement = () => {
    setMeasurements([...measurements, { name: '', bearing: emptyBearing(), distance: '' }])
  }

  const updateMeasurement = (i, field, value) => {
    const updated = [...measurements]
    updated[i] = { ...updated[i], [field]: value }
    setMeasurements(updated)
  }

  const updateMeasBearing = (i, dms) => {
    const updated = [...measurements]
    updated[i].bearing = dms
    setMeasurements(updated)
  }

  const removeMeasurement = (i) => {
    setMeasurements(measurements.filter((_, idx) => idx !== i))
  }

  const handleRadial = async () => {
    if (!origin) { setError('Select origin point'); return }
    if (measurements.length === 0) { setError('Add at least one measurement'); return }
    reset()
    const o = points.find(p => p.id === parseInt(origin))
    const meas = measurements.map(m => ({
      name: m.name || undefined,
      bearingDeg: m.bearing.degrees + m.bearing.minutes / 60 + m.bearing.seconds / 3600,
      distance: parseFloat(m.distance),
    }))
    try {
      const res = await api.post('/calculations/polar/radial', { origin: o, measurements: meas })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
  }

  const addSegment = () => {
    setSegments([...segments, { name: '', bearing: emptyBearing(), distance: '' }])
  }

  const updateSegment = (i, field, value) => {
    const updated = [...segments]
    updated[i] = { ...updated[i], [field]: value }
    setSegments(updated)
  }

  const updateSegBearing = (i, dms) => {
    const updated = [...segments]
    updated[i].bearing = dms
    setSegments(updated)
  }

  const removeSegment = (i) => {
    setSegments(segments.filter((_, idx) => idx !== i))
  }

  const handleSequential = async () => {
    if (!origin) { setError('Select origin point'); return }
    if (segments.length === 0) { setError('Add at least one segment'); return }
    reset()
    const o = points.find(p => p.id === parseInt(origin))
    const segs = segments.map(s => ({
      name: s.name || undefined,
      bearingDeg: s.bearing.degrees + s.bearing.minutes / 60 + s.bearing.seconds / 3600,
      distance: parseFloat(s.distance),
    }))
    try {
      const res = await api.post('/calculations/polar/sequential', { origin: o, segments: segs })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
  }

  const saveToProject = async () => {
    if (!results) return
    const pts = results.points || (results.point ? [results.point] : [])
    for (const pt of pts) {
      try {
        await api.post(`/projects/${projectId}/points`, { name: pt.name, x: pt.x, y: pt.y })
      } catch (err) {
        console.error('Failed to save point:', pt.name)
      }
    }
    onPointAdded()
    alert('Points saved to project!')
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Polar Calculator</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Zero South orientation — Bearing 0° = South, 90° = West, 180° = North, 270° = East</p>

      <div className="flex gap-2 mb-6">
        {MODES.map((m) => (
          <button key={m} onClick={() => { setMode(m); setResults(null); setError('') }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
            }`}>{m}</button>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origin Point</label>
        <select value={origin} onChange={(e) => setOrigin(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">-- Select Origin --</option>
          {points.map(p => <option key={p.id} value={p.id}>{p.name} ({p.x}, {p.y})</option>)}
        </select>
      </div>

      {mode === 'Single' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bearing</label>
            <DMSInput value={bearing} onChange={setBearing} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distance (meters)</label>
            <input type="number" step="any" value={distance} onChange={(e) => setDistance(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleSingle} className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 transition">Calculate Polar</button>
        </div>
      )}

      {mode === 'Radial' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Radial Measurements (from origin)</span>
            <button onClick={addMeasurement} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition">+ Add</button>
          </div>
          {measurements.map((m, i) => (
            <div key={i} className="p-3 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Measurement {i + 1}</span>
                <button onClick={() => removeMeasurement(i)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-xs">Remove</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Name (optional)</label>
                  <input type="text" value={m.name} onChange={(e) => updateMeasurement(i, 'name', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Bearing</label>
                  <DMSInput value={m.bearing} onChange={(dms) => updateMeasBearing(i, dms)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Distance (m)</label>
                  <input type="number" step="any" value={m.distance} onChange={(e) => updateMeasurement(i, 'distance', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          ))}
          {measurements.length > 0 && (
            <button onClick={handleRadial} className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 transition">Calculate Radial Polar</button>
          )}
        </div>
      )}

      {mode === 'Sequential' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sequential Segments</span>
            <button onClick={addSegment} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition">+ Add</button>
          </div>
          {segments.map((s, i) => (
            <div key={i} className="p-3 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Segment {i + 1}</span>
                <button onClick={() => removeSegment(i)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-xs">Remove</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Name (optional)</label>
                  <input type="text" value={s.name} onChange={(e) => updateSegment(i, 'name', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Bearing</label>
                  <DMSInput value={s.bearing} onChange={(dms) => updateSegBearing(i, dms)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Distance (m)</label>
                  <input type="number" step="any" value={s.distance} onChange={(e) => updateSegment(i, 'distance', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          ))}
          {segments.length > 0 && (
            <button onClick={handleSequential} className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 transition">Calculate Sequential Polar</button>
          )}
        </div>
      )}

      {error && <div className="mt-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">{error}</div>}

      {results && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Results</h4>
            {results.point && (
              <button onClick={() => downloadCSV(
                ['Name', 'X', 'Y'],
                [{ Name: results.point.name, X: results.point.x, Y: results.point.y }],
                'polar_single.csv'
              )} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                Download CSV
              </button>
            )}
            {results.points && (
              <button onClick={() => downloadCSV(
                ['Name', 'X', 'Y', 'Bearing', 'Distance'],
                results.points.map(p => ({ Name: p.name, X: p.x, Y: p.y, Bearing: p.bearingDeg?.toFixed(4), Distance: p.distance })),
                'polar_results.csv'
              )} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                Download CSV
              </button>
            )}
          </div>
          {results.point && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-4 rounded">
              <p className="text-gray-800 dark:text-gray-200"><strong>{results.point.name}</strong></p>
              <p className="text-gray-700 dark:text-gray-300">X (Southing): {results.point.x}</p>
              <p className="text-gray-700 dark:text-gray-300">Y (Westing): {results.point.y}</p>
            </div>
          )}
          {results.points && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="p-2 border border-gray-300 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Name</th>
                    <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">X (Southing)</th>
                    <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Y (Westing)</th>
                    <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Bearing</th>
                    <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Distance (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.points.map((pt, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                      <td className="p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{pt.name}</td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-800 dark:text-gray-200">{pt.x}</td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-800 dark:text-gray-200">{pt.y}</td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-gray-800 dark:text-gray-200">{pt.bearingDeg?.toFixed(4)}°</td>
                      <td className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-800 dark:text-gray-200">{pt.distance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={saveToProject} className="mt-4 bg-green-600 text-white px-6 py-2 rounded text-sm hover:bg-green-700 transition">
            Save Results to Project
          </button>
        </div>
      )}
    </div>
  )
}
