import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

// This page is already routed at /bookings/new (book) and /bookings/:id (edit),
// and both routes are wrapped in <ProtectedRoute>.

const defaults = { roomNumber: '', startDate: '', endDate: '', purpose: '' }

function bookingFields(booking) {
  return {
    roomNumber: booking.roomNumber,
    startDate: booking.startDate.slice(0, 10),
    endDate: booking.endDate.slice(0, 10),
    purpose: booking.purpose || ''
  }
}

export default function BookingForm() {
  const nav = useNavigate()
  const { id } = useParams()
  const { state } = useLocation()
  const initialBooking = state?.booking?._id === id ? state.booking : null
  const [form, setForm] = useState(() => initialBooking ? bookingFields(initialBooking) : defaults)
  const [loading, setLoading] = useState(Boolean(id && !initialBooking))
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    if (!id) {
      setForm(defaults)
      setLoading(false)
      return
    }
    if (initialBooking) {
      setForm(bookingFields(initialBooking))
      setLoading(false)
      return
    }
    setLoading(true)
    let active = true

    async function loadBooking() {
      try {
        const { data } = await api.get(`/bookings/${id}`)
        if (!active) return
        const { booking } = data
        setForm(bookingFields(booking))
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || 'Could not load booking')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBooking()
    return () => { active = false }
  }, [id, initialBooking])

  function onChange(e) {
    const { name, value } = e.target
    setForm(previous => ({
      ...previous,
      [name]: value
    }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      if (id) {
        await api.patch(`/bookings/${id}`, form)
      } else {
        await api.post('/bookings', form)
      }
      nav('/bookings')
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save booking')
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'New'} Booking</h1>
      {loading && <p role="status" className="text-sm mb-3">Loading booking…</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <fieldset disabled={loading} className="space-y-3">
        <label className="block">
          <span className="block text-sm mb-1">Room number</span>
          <input className="input" name="roomNumber" type="text" placeholder="B2-104" value={form.roomNumber} onChange={onChange} required />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Start date</span>
          <input className="input" name="startDate" type="date" value={form.startDate} onChange={onChange} required />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">End date</span>
          <input className="input" name="endDate" type="date" value={form.endDate} onChange={onChange} required />
        </label>
        <label className="block">
          <span className="block text-sm mb-1">Purpose (optional)</span>
          <textarea className="input" name="purpose" rows={3} value={form.purpose} onChange={onChange} />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn" type="submit">Save</button>
        </fieldset>
      </form>
    </div>
  )
}
