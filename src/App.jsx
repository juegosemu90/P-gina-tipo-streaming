import { useState, useCallback } from 'react'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import Inicio from './pages/Inicio'
import Favoritos from './pages/Favoritos'

export default function App() {
  const [page, setPage] = useState('inicio')
  const [toast, setToast] = useState({ visible: false, message: '' })

  let toastTimer

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer)
    setToast({ visible: true, message: msg })
    toastTimer = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2600)
  }, [])

  return (
    <>
      <Navbar page={page} setPage={setPage} />

      <main style={{ position: 'relative', zIndex: 1, paddingTop: 'var(--nav-h)' }}>
        {page === 'inicio'    && <Inicio />}
        {page === 'favoritos' && <Favoritos />}
      </main>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  )
}
