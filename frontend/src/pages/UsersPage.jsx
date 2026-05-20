import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await api.get('/auth/users')
      setUsers(res.data)
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">Registered Users</h1>
        </div>
        <button onClick={loadUsers}
          className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center text-gray-500 dark:text-gray-400">No users registered yet.</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="text-left p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold">#</th>
                  <th className="text-left p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold">Username</th>
                  <th className="text-left p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold">Email</th>
                  <th className="text-left p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold">Registered</th>
                  <th className="text-left p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold">Last Login</th>
                  <th className="text-center p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-center">{i + 1}</td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">
                      {u.username}
                      {user?.id === u.id && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">(you)</span>}
                    </td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400">{u.email || '—'}</td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400">{new Date(u.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </td>
                    <td className="p-3 border border-gray-300 dark:border-gray-600 text-center">
                      {u.last_login ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Active</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">Never logged in</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700">
            Total registered users: {users.length}
          </div>
        </div>
      )}
    </div>
  )
}
