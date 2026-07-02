import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { useConfig } from './useConfig'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import BrowserWarning from './components/BrowserWarning'
import Inicio from './pages/Inicio'
import Admin from './pages/Admin'
import Login from './pages/Login'

function getHashPage() {
  const hash = window.location.hash.replace('#/', '').split('/')[0]
  const valid = ['inicio', 'admin', 'login']
  return valid.includes(hash) ? hash : 'inicio'
}

export default function App() {
  const [page,        setPage]        = useState(getHashPage)
  const [user,        setUser]        = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [isWatching,  setIsWatching]  = useState(false)

  const { config, playerConfig } = useConfig()

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/episodio/')) return
      setPage(getHashPage())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthChecked(true) })
    return unsub
  }, [])

  // Mientras se ve un episodio: quita el padding-bottom fijo del body
  // (el que reserva espacio para la barra inferior) y bloquea el scroll,
  // para que el reproductor llene la pantalla exacta sin espacio extra deslizable.
  useEffect(() => {
    if (isWatching) {
      document.body.style.paddingBottom = '0px'
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.paddingBottom = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.paddingBottom = ''
      document.body.style.overflow = ''
    }
  }, [isWatching])

  if (!authChecked) return null

  const showNavbar = page !== 'admin' && page !== 'login' && !isWatching

  return (
    <>
      <BrowserWarning />
      {showNavbar && <Navbar />}
      <main style={{ position: 'relative', zIndex: 1, paddingTop: showNavbar ? 'var(--nav-h)' : 0 }}>
        {page === 'inicio' && (
          <Inicio
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            playerConfig={playerConfig}
            onWatchingChange={setIsWatching}
          />
        )}
        {page === 'login' && <Login onLogin={() => { window.location.hash = '/admin'; setPage('admin') }} />}
        {page === 'admin' && user  && <Admin user={user} onLogout={() => { window.location.hash = '/inicio'; setPage('inicio') }} />}
        {page === 'admin' && !user && <Login onLogin={() => { window.location.hash = '/admin'; setPage('admin') }} />}
      </main>
      {showNavbar && <BottomNav active={page} onSearch={() => setSearchOpen(true)} />}
    </>
  )
}
