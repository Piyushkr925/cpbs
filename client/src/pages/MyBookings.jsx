import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../services/api';

function formatTime(time) {
  if (!time) return '';
  return String(time).slice(0, 5);
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    bookingApi
      .getMyBookings()
      .then(({ data }) => setBookings(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-4">Loading bookings...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Link to="/" className="text-blue-600">Back to Booking</Link>
      </div>
      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="border p-4 rounded">
              <p className="font-semibold">{b.pitch?.name}</p>
              <p className="text-sm text-gray-600">{b.pitch?.location}</p>
              <p>Date: {b.booking_date}</p>
              <p>
                Time: {formatTime(b.slot?.start_time)} – {formatTime(b.slot?.end_time)}
              </p>
              <p>Status: {b.status}</p>
              <p>Price: ₹{b.pitch?.price_per_hour}/hr</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
