import { useState, useEffect, useCallback } from 'react'
import PetalCanvas from './components/PetalCanvas'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import Inicio from './pages/Inicio'
import Favoritos from './pages/Favoritos'
import { EPISODES } from './data/episodes'

export default function App() {
  const [page, setPage] = useState('inicio')
  const [favorites, setFavorites] = useState(EPISODES)
  const [toast, setToast] = useState({ visible: false, message: '' })

  let toastTimer

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer)
    setToast({ visible: true, message: msg })
    toastTimer = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2600)
  }, [])

  const toggleFav = useCallback((id) => {
    setFavorites(prev => {
      const next = prev.map(ep => ep.id === id ? { ...ep, _removed: !ep._removed } : ep)
      const ep = next.find(e => e.id === id)
      showToast(ep._removed ? 'Eliminado de Favoritos' : 'Guardado en Favoritos')
      return next
    })
  }, [showToast])

  const activeFavorites = favorites.filter(ep => !ep._removed)

  return (
    <>
      <PetalCanvas />

      <Navbar
        page={page}
        setPage={setPage}
        favCount={activeFavorites.length}
      />

      <main style={{ position: 'relative', zIndex: 1, paddingTop: 'var(--nav-h)' }}>
        {page === 'inicio'     && <Inicio />}
        {page === 'favoritos'  && <Favoritos favorites={activeFavorites} onToggleFav={toggleFav} />}
      </main>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  )
}
