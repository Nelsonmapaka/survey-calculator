import { useState } from 'react'
import api from '../api/axios'

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function AreaCalculator({ points }) {
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const togglePoint = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 1 && id === prev[0]) {
        return prev
      }
      return [...prev, id]
    })
    setResult(null)
    setError('')
  }

  const calculateArea = async () => {
    if (selected.length < 3) {
      setError('Select at least 3 points to form a polygon')
      return
    }
    const pts = selected.map(id => points.find(p => p.id === parseInt(id)))
    try {
      const res = await api.post('/calculations/area', { points: pts })
      setResult(res.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
  }

  const clearSelection = () => {
    setSelected([])
    setResult(null)
    setError('')
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Area Calculator (Shoelace Method)</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Select at least 3 points in order to form a closed polygon. The area will be calculated using the shoelace formula.</p>

      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected: {selected.length} point{selected.length !== 1 && 's'}</span>
        {selected.length > 0 && (
          <button onClick={clearSelection} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm">Clear</button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-sm text-gray-800 dark:text-gray-200">
          Polygon order: {selected.map(id => points.find(p => p.id === id)?.name).join(' → ')}
          {selected.length >= 3 && <span> → {points.find(p => p.id === selected[0])?.name} (close)</span>}
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
        {points.map(p => (
          <label key={p.id} className={`flex items-center gap-2 p-2 border rounded text-sm cursor-pointer transition ${
            selected.includes(p.id)
              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500'
              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}>
            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => togglePoint(p.id)} className="sr-only" />
            <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
              selected.includes(p.id) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-500'
            }`}>
              {selected.includes(p.id) && '✓'}
            </span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
          </label>
        ))}
      </div>

      {error && <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">{error}</div>}

      <button onClick={calculateArea} disabled={selected.length < 3}
        className={`px-6 py-2 rounded text-sm font-medium transition ${
          selected.length < 3
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}>
        Calculate Area
      </button>

      {result && (
        <div className="mt-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-lg text-green-800 dark:text-green-300">Area Result</h4>
            <button onClick={() => downloadCSV(
              ['Area_sqm', 'Area_display'],
              [{ Area_sqm: result.areaSqm, Area_display: result.display }],
              'area_result.csv'
            )} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              Download CSV
            </button>
          </div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-400">{result.display}</div>
          {result.areaHa && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {result.areaSqm} m² = {result.areaHa} ha
            </div>
          )}
          {!result.areaHa && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{result.areaSqm} square meters</div>
          )}
        </div>
      )}
    </div>
  )
}
