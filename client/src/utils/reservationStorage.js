const STORAGE_KEY_PREFIX = 'cpbs_active_reservation';

function storageKey(userId) {
  return userId ? `${STORAGE_KEY_PREFIX}_${userId}` : STORAGE_KEY_PREFIX;
}

export function saveReservationToStorage(reservation, userId) {
  if (!reservation || !userId) return;
  localStorage.setItem(
    storageKey(userId),
    JSON.stringify({ ...reservation, userId })
  );
}

export function clearReservationStorage(userId) {
  if (userId) {
    localStorage.removeItem(storageKey(userId));
    return;
  }
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

export function getReservationFromStorage(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.userId && data.userId !== userId) return null;
    if (new Date(data.expiresAt) <= new Date()) {
      clearReservationStorage(userId);
      return null;
    }
    return data;
  } catch {
    clearReservationStorage(userId);
    return null;
  }
}

export function subscribeReservationStorage(userId, callback) {
  const handler = (event) => {
    if (event.key === storageKey(userId)) {
      callback(event.newValue ? JSON.parse(event.newValue) : null);
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
