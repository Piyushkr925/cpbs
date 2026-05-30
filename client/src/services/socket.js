import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}

export function joinPitchRoom(pitchId, date) {
  getSocket().emit('join-pitch', { pitchId, date });
}

export function leavePitchRoom(pitchId, date) {
  getSocket().emit('leave-pitch', { pitchId, date });
}

export function onSlotUpdate(callback) {
  getSocket().on('slot-update', callback);
  return () => getSocket().off('slot-update', callback);
}
