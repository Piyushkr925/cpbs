import axios from 'axios';
import { clearReservationStorage } from '../utils/reservationStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      clearReservationStorage();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

export const pitchApi = {
  getAll: () => api.get('/pitches'),
};

export const slotApi = {
  getSlots: (pitchId, date) => api.get('/slots', { params: { pitchId, date } }),
};

export const bookingApi = {
  reserveSlot: (data) => api.post('/reserve-slot', data),
  confirmBooking: (data) => api.post('/confirm-booking', data),
  getActiveReservation: (pitchId, date) =>
    api.get('/active-reservation', { params: { pitchId, date } }),
  getMyBookings: () => api.get('/my-bookings'),
};

export default api;
