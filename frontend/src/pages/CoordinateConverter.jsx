import { useState, useMemo } from 'react'
import proj4 from 'proj4'
import api from '../api/axios'
import { COORDINATE_SYSTEMS, getProjection } from '../config/coordinateSystems'

const GROUPS = [...new Set(COORDINATE_SYSTEMS.map(s => s.group))]

function convert(srcProj, dstProj, x, y) {
  if (!srcProj || !dstProj) return null
  try { proj4.defs('__SRC__', srcProj); proj4.defs('__DST__', dstProj) } catch {}
  const easting = -y; const northing = x
  const out = proj4('__SRC__', '__DST__', [easting, northing])
  if (!isFinite(out[0]) || !isFinite(out[1])) return null
  const x2 = out[1]; const y2 = -out[0]
  return { x: x2, y: y2, lng: out[0], lat: out[1] }
}

export default function CoordinateConverter({ points, project }) {
  const [srcId, setSrcId] = useState(project?.coordinate_system || 'EPSG:32736')
  const [srcZone, setSrcZone] = useState(project?.lo_or_zone || '')
  const [dstId, setDstId] = useState('EPSG:4326')
  const [dstZone, setDstZone] = useState('')
  const [xIn, setXIn] = useState('')
  const [yIn, setYIn] = useState('')
  const [result, setResult] = useState(null)
  const [multiInput, setMultiInput] = useState('')
  const [multiResults, setMultiResults] = useState([])
  const [batchSource, setBatchSource] = useState('all')

  const srcCs = COORDINATE_SYSTEMS.find(s => s.id === srcId)
  const dstCs = COORDINATE_SYSTEMS.find(s => s.id === dstId)

  const srcProj = useMemo(() => {
    const p = getProjection(srcId, srcZone)
    if (p) return p
    if (srcCs?.proj) return srcCs.proj
    return null
  }, [srcId, srcZone, srcCs])

  const dstProj = useMemo(() => {
    const p = getProjection(dstId, dstZone)
    if (p) return p
    if (dstCs?.proj) return dstCs.proj
    return null
  }, [dstId, dstZone, dstCs])

  const doConvert = () => {
    const x = parseFloat(xIn); const y = parseFloat(yIn)
    if (isNaN(x) || isNaN(y)) return
    const r = convert(srcProj, dstProj, x, y)
    setResult(r)
  }

  const doBatch = () => {
    let pts = []
    if (batchSource === 'all' && points?.length > 0) {
      pts = points
    } else if (batchSource === 'selected' && points?.length > 0) {
      // Could add selected point IDs, for now use first 10
      pts = points.slice(0, Math.min(10, points.length))
    } else if (multiInput.trim()) {
      pts = multiInput.trim().split('\n').map(line => {
        const cols = line.split(',').map(s => s.trim())
        if (cols.length >= 3) return { name: cols[0], x: parseFloat(cols[1]), y: parseFloat(cols[2]) }
        if (cols.length >= 2) return { name: 'P', x: parseFloat(cols[0]), y: parseFloat(cols[1]) }
        return null
      }).filter(p => p && !isNaN(p.x) && !isNaN(p.y))
    }
    const r = pts.map(p => { const c = convert(srcProj, dstProj, p.x, p.y); return { ...p, result: c } })
    setMultiResults(r)
  }

  const swapCRS = () => {
    const tmpId = srcId; const tmpZone = srcZone
    setSrcId(dstId); setSrcZone(dstZone)
    setDstId(tmpId); setDstZone(tmpZone)
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Coordinate Converter</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Convert coordinates between any supported reference systems. X = Southing, Y = Westing.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Source CRS */}
        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Source CRS</h4>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">System</label>
            <select value={srcId} onChange={e => setSrcId(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              {GROUPS.map(g => (
                <optgroup key={g} label={g}>
                  {COORDINATE_SYSTEMS.filter(s => s.group === g).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {srcCs?.hasZone && (
            <div className="mb-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{srcCs.zoneLabel}</label>
              <input type="text" value={srcZone} onChange={e => setSrcZone(e.target.value)}
                placeholder={srcCs.zonePlaceholder}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" />
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">X (Southing)</label>
              <input type="number" step="any" value={xIn} onChange={e => setXIn(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Y (Westing)</label>
              <input type="number" step="any" value={yIn} onChange={e => setYIn(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" />
            </div>
          </div>
        </div>

        {/* Target CRS */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-blue-700 dark:text-blue-300">Target CRS</h4>
            <button onClick={swapCRS}
              className="text-xs bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-300 dark:hover:bg-blue-600 transition">Swap</button>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">System</label>
            <select value={dstId} onChange={e => setDstId(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
              {GROUPS.map(g => (
                <optgroup key={g} label={g}>
                  {COORDINATE_SYSTEMS.filter(s => s.group === g).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {dstCs?.hasZone && (
            <div className="mb-2">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{dstCs.zoneLabel}</label>
              <input type="text" value={dstZone} onChange={e => setDstZone(e.target.value)}
                placeholder={dstCs.zonePlaceholder}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" />
            </div>
          )}

          <button onClick={doConvert}
            className="mt-2 w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 transition font-medium">Convert</button>

          {result && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded border border-blue-200 dark:border-blue-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Result:</div>
              <div className="text-sm font-bold text-gray-800 dark:text-gray-200 font-mono">
                X: {result.x.toFixed(3)} | Y: {result.y.toFixed(3)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Lat: {result.lat.toFixed(6)}° | Lng: {result.lng.toFixed(6)}°
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batch Conversion */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Batch Conversion</h4>

        <div className="mb-3">
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source</label>
          <div className="flex gap-2">
            <button onClick={() => setBatchSource('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${batchSource === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>All Project Points</button>
            <button onClick={() => setBatchSource('custom')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${batchSource === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>Paste Custom</button>
          </div>
        </div>

        {batchSource === 'custom' && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Paste points (name,x,y per line, or x,y per line)</label>
            <textarea value={multiInput} onChange={e => setMultiInput(e.target.value)} rows={4}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm" />
          </div>
        )}

        <button onClick={doBatch}
          className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 transition font-medium">Convert All</button>

        {multiResults.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300">Name</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Source X</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Source Y</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">→ Target X</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">→ Target Y</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Lat</th>
                  <th className="p-2 border border-gray-300 dark:border-gray-600 text-right text-gray-700 dark:text-gray-300">Lng</th>
                </tr>
              </thead>
              <tbody>
                {multiResults.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">{p.name}</td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-gray-600 dark:text-gray-400">{p.x.toFixed(3)}</td>
                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-gray-600 dark:text-gray-400">{p.y.toFixed(3)}</td>
                    {p.result ? (
                      <>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-green-700 dark:text-green-400">{p.result.x.toFixed(3)}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-green-700 dark:text-green-400">{p.result.y.toFixed(3)}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-gray-500">{p.result.lat.toFixed(5)}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-mono text-gray-500">{p.result.lng.toFixed(5)}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="p-2 border border-gray-300 dark:border-gray-600 text-center text-red-500">Conversion failed</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex gap-2">
              <button onClick={() => {
                const csv = ['name,source_x,source_y,target_x,target_y,lat,lng']
                multiResults.forEach(p => {
                  if (p.result) csv.push(`${p.name},${p.x},${p.y},${p.result.x},${p.result.y},${p.result.lat},${p.result.lng}`)
                })
                const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `converted_coords.csv`
                a.click()
              }}
                className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                Download CSV
              </button>
              {project && (
                <button onClick={async () => {
                  try {
                    const savePts = multiResults.filter(p => p.result && p.id)
                    for (const p of savePts) {
                      await api.delete(`/projects/${project.id}/points/${p.id}`)
                      await api.post(`/projects/${project.id}/points`, {
                        name: p.name + '_conv',
                        x: p.result.x,
                        y: p.result.y,
                      })
                    }
                    alert(`Saved ${savePts.length} converted points with "_conv" suffix`)
                  } catch { alert('Failed to save some points') }
                }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition">
                  Save Converted to Project
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
