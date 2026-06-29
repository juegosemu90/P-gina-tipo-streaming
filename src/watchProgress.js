// Sistema simple de progreso de episodios guardado en el navegador (localStorage)
// Cada episodio guarda: { time: segundos vistos, duration: duración total, pct: 0-100 }

const STORAGE_KEY = 'rosatv_progress'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (e) {
    return {}
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {}
}

// Guarda el progreso de un episodio (se llama cada pocos segundos mientras se ve)
export function saveProgress(episodeId, currentTime, duration) {
  if (!episodeId || !duration) return
  const all = readAll()
  const pct = Math.min(100, Math.round((currentTime / duration) * 100))
  // Si ya casi terminó (>=95%), se considera visto completo y se limpia el progreso
  if (pct >= 95) {
    delete all[episodeId]
  } else {
    all[episodeId] = { time: currentTime, duration, pct, updatedAt: Date.now() }
  }
  writeAll(all)
}

// Obtiene el progreso de un episodio específico, o null si no tiene
export function getProgress(episodeId) {
  if (!episodeId) return null
  const all = readAll()
  return all[episodeId] || null
}

// Obtiene el progreso de varios episodios a la vez (para mostrar los aros en la lista)
export function getAllProgress() {
  return readAll()
}

// Borra el progreso de un episodio (ej: cuando el usuario elige "Empezar desde el inicio")
export function clearProgress(episodeId) {
  const all = readAll()
  delete all[episodeId]
  writeAll(all)
}
