import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Navbar from './components/Navbar'
import Inicio from './pages/Inicio'
import Favoritos from './pages/Favoritos'
import Admin from './pages/Admin'
import Login from './pages/Login'

export default function App() {
  const [page, setPage]           = useState('inicio')
  const [user, setUser]           = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthChecked(true)
    })
    return unsub
  }, [])

  if (!authChecked) return null

  const handleSetPage = (p) => {
    if (p === 'admin' && !user) setPage('login')
    else setPage(p)
  }

  return (
    <>
      <Navbar page={page} setPage={handleSetPage} user={user} />
      <main style={{ position: 'relative', zIndex: 1, paddingTop: 'var(--nav-h)' }}>
        {page === 'inicio'    && <Inicio />}
        {page === 'favoritos' && <Favoritos />}
        {page === 'login'     && <Login onLogin={() => setPage('admin')} />}
        {page === 'admin'     && user && <Admin user={user} onLogout={() => setPage('inicio')} />}
      </main>
    </>
  )
}
