import { useState } from 'react'
import api from '../api/axios'

const MODES = ['Single', 'Radial', 'Sequential']

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => r[h]).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function JoinCalculator({ points }) {
  const [mode, setMode] = useState('Single')
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')
  const [origin, setOrigin] = useState('')
  const [targets, setTargets] = useState([])
  const [sequence, setSequence] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const reset = () => {
    setResults(null)
    setError('')
  }

  const handleSingle = async () => {
    if (!selectedA || !selectedB) { setError('Select two points'); return }
    reset()
    const p1 = points.find(p => p.id === parseInt(selectedA))
    const p2 = points.find(p => p.id === parseInt(selectedB))
    try {
      const res = await api.post('/calculations/join', { points: [p1, p2] })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
  }

  const handleRadial = async () => {
    if (!origin || targets.length === 0) { setError('Select origin and at least one target'); return }
    reset()
    const o = points.find(p => p.id === parseInt(origin))
    const ts = targets.map(id => points.find(p => p.id === parseInt(id)))
    try {
      const res = await api.post('/calculations/join/radial', { origin: o, targets: ts })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
  }

  const handleSequential = async () => {
    if (sequence.length < 2) { setError('Select at least 2 points in sequence'); return }
    reset()
    const pts = sequence.map(id => points.find(p => p.id === parseInt(id)))
    try {
      const res = await api.post('/calculations/join', { points: pts })
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
  }

  const toggleTarget = (id) => {
    setTargets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSequence = (id) => {
    setSequence(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Join Calculator</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Zero South orientation — X increases South, Y increases West</p>

      <div className="flex gap-2 mb-6">
        {MODES.map((m) => (
          <button key={m} onClick={() => { setMode(m); setResults(null); setError('') }}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
            }`}>{m}</button>
        ))}
      </div>

      {mode === 'Single' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Point A</label>
              <select value={selectedA} onChange={(e) => setSelectedA(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select --</option>
                {points.map(p => <option key={p.id} value={p.id}>{p.name} ({p.x}, {p.y})</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Point B</label>
              <select value={selectedB} onChange={(e) => setSelectedB(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select --</option>
                {points.map(p => <option key={p.id} value={p.id}>{p.name} ({p.x}, {p.y})</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSingle} className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 transition">Calculate Join</button>
        </div>
      )}

      {mode === 'Radial' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origin Point</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Select Origin --</option>
              {points.map(p => <option key={p.id} value={p.id}>{p.name} ({p.x}, {p.y})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Points</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded">
              {points.filter(p => p.id !== parseInt(origin)).map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={targets.includes(p.id)} onChange={() => toggleTarget(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <button onClick={handleRadial} className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 transition">Calculate Radial Join</button>
        </div>
      )}

      {mode === 'Sequential' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Points in Order</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select points in the order you want to calculate joins between them.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded">
              {points.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={sequence.includes(p.id)} onChange={() => toggleSequence(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
            {sequence.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Sequence: {sequence.map(id => points.find(p => p.id === id)?.name).join(' → ')}
              </div>
            )}
          </div>
          <button onClick={handleSequential} className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 transition">Calculate Sequential Join</button>
        </div>
      )}

      {error && <div className="mt-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded text-sm">{error}</div>}

      {results && results.joins && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Results</h4>
            <button onClick={() => downloadCSV(
              ['From', 'To', 'DeltaX', 'DeltaY', 'Distance', 'Bearing'],
              results.joins.map(j => ({ From: j.from, To: j.to, DeltaX: j.dx, DeltaY: j.dy, Distance: j.distance, Bearing: j.bearingDMS })),
              'join_results.csv'
            )} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              Download CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">From</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">To</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">ΔX (m)</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">ΔY (m)</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Distance (m)</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Bearing</th>
                </tr>
              </thead>
              <tbody>
                {results.joins.map((j, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{j.from}</td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{j.to}</td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-800 dark:text-gray-200">{j.dx}</td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-800 dark:text-gray-200">{j.dy}</td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-semibold text-gray-800 dark:text-gray-200">{j.distance}</td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-gray-800 dark:text-gray-200">{j.bearingDMS}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
