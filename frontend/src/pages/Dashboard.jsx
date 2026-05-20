import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { COORDINATE_SYSTEMS } from '../config/coordinateSystems'

function systemName(id) {
  const found = COORDINATE_SYSTEMS.find(s => s.id === id)
  return found ? found.name : id
}

function systemShort(id) {
  const found = COORDINATE_SYSTEMS.find(s => s.id === id)
  if (!found) return id
  if (found.group === 'Custom') return found.name
  return found.name
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [trash, setTrash] = useState([])
  const [showTrash, setShowTrash] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [coordSystem, setCoordSystem] = useState('custom-gauss')
  const [loOrZone, setLoOrZone] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const selectedCS = COORDINATE_SYSTEMS.find(s => s.id === coordSystem)

  useEffect(() => {
    if (showTrash) {
      loadTrash()
    } else {
      loadProjects()
    }
  }, [showTrash])

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects')
      setProjects(res.data)
    } catch (err) {
      console.error('Failed to load projects')
    }
  }

  const loadTrash = async () => {
    try {
      const res = await api.get('/projects/trash')
      setTrash(res.data)
    } catch (err) {
      console.error('Failed to load trash')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/projects', { name, coordinate_system: coordSystem, lo_or_zone: loOrZone })
      setShowCreate(false)
      setName('')
      setLoOrZone('')
      navigate(`/projects/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Move this project to trash?')) return
    try {
      await api.delete(`/projects/${id}`)
      loadProjects()
    } catch (err) {
      console.error('Delete failed')
    }
  }

  const handleRestore = async (id) => {
    try {
      await api.post(`/projects/${id}/restore`)
      loadTrash()
    } catch (err) {
      console.error('Restore failed')
    }
  }

  const handlePermanentDelete = async (id) => {
    if (!confirm('Permanently delete this project? This CANNOT be undone.')) return
    try {
      await api.delete(`/projects/${id}/permanent`)
      loadTrash()
    } catch (err) {
      console.error('Permanent delete failed')
    }
  }

  const emptyTrash = async () => {
    if (!confirm('Permanently delete all projects in trash? This CANNOT be undone.')) return
    for (const p of trash) {
      await api.delete(`/projects/${p.id}/permanent`)
    }
    loadTrash()
  }

  const groups = [...new Set(COORDINATE_SYSTEMS.map(s => s.group))]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          {showTrash ? 'Recycle Bin' : 'My Projects'}
        </h1>
        <div className="flex items-center gap-2">
          {!showTrash && (
            <button onClick={() => setShowCreate(!showCreate)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm font-medium">
              {showCreate ? 'Cancel' : '+ New Project'}
            </button>
          )}
          <button onClick={() => { setShowTrash(!showTrash); setShowCreate(false) }}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              showTrash
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            {showTrash ? 'Active Projects' : 'Trash'}
          </button>
          <Link to="/manual"
            className="px-4 py-2 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition inline-block">
            Manual
          </Link>
          <Link to="/users"
            className="px-4 py-2 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition inline-block">
            Users
          </Link>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Create New Project</h3>
          {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Project Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Coordinate System</label>
              <select value={coordSystem} onChange={(e) => { setCoordSystem(e.target.value); setLoOrZone('') }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                {groups.map(group => (
                  <optgroup key={group} label={group}>
                    {COORDINATE_SYSTEMS.filter(s => s.group === group).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {selectedCS?.hasZone && (
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">{selectedCS.zoneLabel}</label>
                <input type="text" value={loOrZone} onChange={(e) => setLoOrZone(e.target.value)}
                  placeholder={selectedCS.zonePlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition text-sm font-medium">Create Project</button>
          </form>
        </div>
      )}

      {showTrash ? (
        <>
          {trash.length > 0 && (
            <div className="mb-4 flex justify-end">
              <button onClick={emptyTrash}
                className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition">
                Empty Trash
              </button>
            </div>
          )}
          {trash.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center text-gray-500 dark:text-gray-400 transition-colors">
              Trash is empty.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trash.map((p) => (
                <div key={p.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-red-200 dark:border-red-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{p.name}</h3>
                    <span className="text-xs text-red-500 dark:text-red-400 font-medium">Deleted</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    System: {systemShort(p.coordinate_system)}{p.lo_or_zone ? ` (${p.lo_or_zone})` : ''}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">Points: {p.point_count}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestore(p.id)}
                      className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 transition">
                      Restore
                    </button>
                    <button onClick={() => handlePermanentDelete(p.id)}
                      className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700 transition">
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center text-gray-500 dark:text-gray-400 transition-colors">
              No projects yet. Click "New Project" to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow border dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{p.name}</h3>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 text-sm">Delete</button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    System: {systemShort(p.coordinate_system)}{p.lo_or_zone ? ` (${p.lo_or_zone})` : ''}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">Points: {p.point_count}</p>
                  <Link to={`/projects/${p.id}`}
                    className="inline-block bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
