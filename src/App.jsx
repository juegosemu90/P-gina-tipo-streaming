import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Navbar from './components/Navbar'
import Inicio from './pages/Inicio'
import Favoritos from './pages/Favoritos'
import Admin from './pages/Admin'
import Login from './pages/Login'

// Lee y escribe el hash de la URL
function getHashPage() {
  const hash = window.location.hash.replace('#/', '').split('/')[0]
  const valid = ['inicio', 'favoritos', 'admin', 'login']
  return valid.includes(hash) ? hash : 'inicio'
}

export default function App() {
  const [page,        setPage]        = useState(getHashPage)
  const [user,        setUser]        = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Sincronizar hash → estado cuando el usuario usa atrás/adelante
  useEffect(() => {
    const onHashChange = () => setPage(getHashPage())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthChecked(true)
    })
    return unsub
  }, [])

  const handleSetPage = (p) => {
    if (p === 'admin' && !user) {
      window.location.hash = '/login'
      setPage('login')
    } else {
      window.location.hash = '/' + p
      setPage(p)
    }
  }

  if (!authChecked) return null

  return (
    <>
      <Navbar page={page} setPage={handleSetPage} user={user} />
      <main style={{ position: 'relative', zIndex: 1, paddingTop: 'var(--nav-h)' }}>
        {page === 'inicio'    && <Inicio />}
        {page === 'favoritos' && <Favoritos />}
        {page === 'login'     && <Login onLogin={() => handleSetPage('admin')} />}
        {page === 'admin'     && user && <Admin user={user} onLogout={() => handleSetPage('inicio')} />}
      </main>
    </>
  )
}
