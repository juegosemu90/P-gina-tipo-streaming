import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { useConfig } from './useConfig'
import Navbar from './components/Navbar'
import Inicio from './pages/Inicio'
import Temporadas from './pages/Temporadas'
import Admin from './pages/Admin'
import Login from './pages/Login'

function getHashPage() {
  const hash = window.location.hash.replace('#/', '').split('/')[0]
  const valid = ['inicio', 'temporadas', 'admin', 'login']
  return valid.includes(hash) ? hash : 'inicio'
}

export default function App() {
  const [page,        setPage]        = useState(getHashPage)
  const [user,        setUser]        = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  // Guarda desde qué página se abrió el episodio (inicio o temporadas)
  const [originPage,  setOriginPage]  = useState('inicio')

  const { config, playerConfig } = useConfig()

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      // Si el hash sigue siendo /episodio, no tocamos "page" — el reproductor sigue activo
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

  const handleSetPage = (p) => {
    setSearchOpen(false)
    window.location.hash = '/' + p
    setPage(p)
    setOriginPage(p)
  }

  if (!authChecked) return null

  return (
    <>
      <Navbar page={page} setPage={handleSetPage} onSearch={() => setSearchOpen(true)} />
      <main style={{ position: 'relative', zIndex: 1, paddingTop: 'var(--nav-h)' }}>
        {page === 'inicio'      && (
          <Inicio
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            playerConfig={playerConfig}
            onEpisodeOpen={() => setOriginPage('inicio')}
          />
        )}
        {page === 'temporadas'  && (
          <Temporadas
            playerConfig={playerConfig}
            onEpisodeOpen={() => setOriginPage('temporadas')}
          />
        )}
        {page === 'login'       && <Login onLogin={() => { window.location.hash = '/admin'; setPage('admin') }} />}
        {page === 'admin'       && user  && <Admin user={user} onLogout={() => { window.location.hash = '/inicio'; setPage('inicio') }} />}
        {page === 'admin'       && !user && <Login onLogin={() => { window.location.hash = '/admin'; setPage('admin') }} />}
      </main>
    </>
  )
}
