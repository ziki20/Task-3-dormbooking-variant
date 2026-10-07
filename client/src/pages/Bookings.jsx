import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../hooks/useAuth'

function formatDate(d) {
  return new Date(d).toLocaleDateString()
}

export default function Bookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')

  async function load() {
    const res = await api.get('/bookings')
    setBookings(res.data.bookings)
  }

  useEffect(() => { load() }, [])

  async function onCancel(id) {
    setError('')
    try {
      await api.delete('/bookings/' + id)
      setBookings(prev => prev.filter(b => b._id !== id))
    } catch (err) {
      setError(err?.response?.data?.message || 'Cancel failed')
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bookings.map(b => {
          const isMine = user && b.bookedBy?._id === user.id
          return (
            <div key={b._id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Room {b.roomNumber}</div>
                  <div className="text-sm text-zinc-600">
                    {formatDate(b.startDate)} – {formatDate(b.endDate)} • by {b.bookedBy?.name || 'unknown'}
                  </div>
                </div>
                {isMine && (
                  <div className="flex gap-2">
                    <Link to={`/bookings/${b._id}`} state={{ booking: b }} className="btn text-sm">Edit</Link>
                    <button onClick={() => onCancel(b._id)} className="btn text-sm">Cancel</button>
                  </div>
                )}
              </div>
              {b.purpose && <p className="mt-2 text-sm">{b.purpose}</p>}
            </div>
          )
        })}
        {bookings.length === 0 && <div className="text-sm text-zinc-600">No bookings yet.</div>}
      </div>
    </div>
  )
}
