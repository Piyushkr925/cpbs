import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pitchApi, slotApi, bookingApi } from '../services/api';
import { joinPitchRoom, leavePitchRoom, onSlotUpdate } from '../services/socket';
import {
  saveReservationToStorage,
  clearReservationStorage,
  getReservationFromStorage,
  subscribeReservationStorage,
} from '../utils/reservationStorage';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function applyReservationState(data, setReservation, setSelectedSlot, setSelectedPitch, setDate) {
  if (!data) return;
  setReservation(data);
  setSelectedSlot(data.slotId);
  if (data.pitchId) setSelectedPitch(String(data.pitchId));
  if (data.date) setDate(data.date);
}

export default function BookingPage() {
  const { user, logout } = useAuth();
  const [pitches, setPitches] = useState([]);
  const [selectedPitch, setSelectedPitch] = useState('');
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const syncReservation = useCallback((data) => {
    if (!user?.id) {
      setReservation(null);
      setSelectedSlot(null);
      return;
    }
    if (!data) {
      setReservation(null);
      setSelectedSlot(null);
      clearReservationStorage(user.id);
      return;
    }
    if (new Date(data.expiresAt) <= new Date()) {
      setReservation(null);
      setSelectedSlot(null);
      clearReservationStorage(user.id);
      return;
    }
    applyReservationState(data, setReservation, setSelectedSlot, setSelectedPitch, setDate);
    saveReservationToStorage(data, user.id);
  }, [user?.id]);

  const restoreActiveReservation = useCallback(async (pitchId, bookingDate) => {
    if (!user?.id) {
      syncReservation(null);
      return;
    }
    try {
      const { data } = await bookingApi.getActiveReservation(pitchId, bookingDate);
      if (data) {
        syncReservation(data);
        return;
      }
      syncReservation(null);
    } catch {
      const stored = getReservationFromStorage(user.id);
      if (
        stored &&
        String(stored.pitchId) === String(pitchId) &&
        stored.date === bookingDate
      ) {
        syncReservation(stored);
      } else {
        syncReservation(null);
      }
    }
  }, [syncReservation, user?.id]);

  const loadPitches = useCallback(async () => {
    const { data } = await pitchApi.getAll();
    setPitches(data);
    if (data.length > 0 && !selectedPitch) {
      setSelectedPitch(String(data[0].id));
    }
  }, [selectedPitch]);

  const loadSlots = useCallback(async () => {
    if (!selectedPitch || !date) return;
    setError('');
    try {
      const { data } = await slotApi.getSlots(selectedPitch, date);
      setSlots(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load slots');
    }
  }, [selectedPitch, date]);

  useEffect(() => {
    loadPitches();
  }, [loadPitches]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    setReservation(null);
    setSelectedSlot(null);
    setMessage('');
    setError('');
  }, [user?.id]);

  useEffect(() => {
    if (selectedPitch && date && user?.id) {
      restoreActiveReservation(selectedPitch, date);
    }
  }, [selectedPitch, date, user?.id, restoreActiveReservation]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return subscribeReservationStorage(user.id, (data) => {
      if (data && data.userId === user.id) {
        applyReservationState(data, setReservation, setSelectedSlot, setSelectedPitch, setDate);
      } else {
        setReservation(null);
        setSelectedSlot(null);
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (!selectedPitch || !date) return;

    joinPitchRoom(selectedPitch, date);
    const unsubscribe = onSlotUpdate((payload) => {
      if (
        String(payload.pitchId) === String(selectedPitch) &&
        payload.date === date
      ) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === payload.slotId
              ? {
                  ...s,
                  availability: payload.availability,
                  reserved_by: payload.userId || null,
                  expires_at: payload.expiresAt || null,
                }
              : s
          )
        );
      }
    });

    return () => {
      unsubscribe();
      leavePitchRoom(selectedPitch, date);
    };
  }, [selectedPitch, date]);

  useEffect(() => {
    if (!reservation?.expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(reservation.expiresAt) - Date.now()) / 1000)
      );
      setCountdown(remaining);
      if (remaining === 0) {
        syncReservation(null);
        loadSlots();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [reservation, loadSlots, syncReservation]);

  const handleSelectSlot = async (slot) => {
    if (slot.availability !== 'available') return;
    if (loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await bookingApi.reserveSlot({
        pitchId: Number(selectedPitch),
        slotId: slot.id,
        date,
      });
      syncReservation(data);
      setMessage(data.message);
      await loadSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reserve slot');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!reservation || loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await bookingApi.confirmBooking({
        reservationId: reservation.reservationId,
      });
      setMessage(
        data.alreadyConfirmed
          ? 'Booking was already confirmed.'
          : 'Booking confirmed successfully!'
      );
      syncReservation(null);
      await loadSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  const slotClass = (slot) => {
    const base = 'p-3 border rounded text-center cursor-pointer';
    if (slot.availability === 'booked') return `${base} bg-red-100 cursor-not-allowed`;
    if (slot.availability === 'reserved') {
      if (slot.reserved_by === user?.id) return `${base} bg-yellow-100 border-yellow-500`;
      return `${base} bg-orange-100 cursor-not-allowed`;
    }
    if (selectedSlot === slot.id) return `${base} bg-blue-100 border-blue-500`;
    return `${base} bg-green-50 hover:bg-green-100`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cricket Pitch Booking</h1>
        <div className="flex gap-4 items-center">
          <span>Hi, {user?.name}</span>
          <Link to="/my-bookings" className="text-blue-600">My Bookings</Link>
          <button onClick={logout} className="text-red-600">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-1 font-medium">Select Pitch</label>
          <select
            value={selectedPitch}
            onChange={(e) => {
              setSelectedPitch(e.target.value);
              syncReservation(null);
            }}
            className="w-full border p-2 rounded"
          >
            {pitches.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} – ₹{p.price_per_hour}/hr
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Select Date</label>
          <input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => {
              setDate(e.target.value);
              syncReservation(null);
            }}
            className="w-full border p-2 rounded"
          />
        </div>
      </div>

      {message && <p className="mb-3 text-green-700">{message}</p>}
      {error && <p className="mb-3 text-red-600">{error}</p>}

      {reservation && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-300 rounded">
          <p>Slot reserved. Confirm within {countdown}s</p>
          <button
            onClick={handleConfirm}
            disabled={loading || countdown === 0}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Confirming...' : 'Confirm Booking'}
          </button>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Available Slots</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={slotClass(slot)}
            onClick={() => handleSelectSlot(slot)}
          >
            <p className="font-medium">
              {slot.start_time} – {slot.end_time}
            </p>
            <p className="text-sm capitalize">{slot.availability}</p>
          </div>
        ))}
      </div>

      {slots.length === 0 && <p className="text-gray-500 mt-4">No slots found for this date.</p>}

      <div className="mt-6 flex gap-4 text-sm">
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-green-50 border inline-block"></span> Available</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-yellow-100 border inline-block"></span> Your reservation</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-orange-100 border inline-block"></span> Reserved</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-red-100 border inline-block"></span> Booked</span>
      </div>
    </div>
  );
}
