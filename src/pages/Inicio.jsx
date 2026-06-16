import { useEffect, useState, useRef } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Lock, Search, X } from 'lucide-react'
import EpisodePlayer from './EpisodePlayer'
import styles from './Inicio.module.css'

function getYoutubeId(url) {
  if (!url) return ''
  const m = url.match(/(?:v=|youtu\.be\/)([^&?\/]+)/)
  return m ? m[1] : ''
}

function getPubDate(ep) {
  const src = ep.publishAt || ep.createdAt
  if (!src) return null
  const d = src.toDate ? src.toDate() : new Date(src)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getFeatured(list) {
  if (list.length === 0) return []
  const now = new Date()
  const seed = now.getFullYear() * 100 + now.getMonth()
  const shuffled = [...list].sort((a, b) => {
    const ha = ((seed ^ a.id.charCodeAt(0)) * 2654435761) >>> 0
    const hb = ((seed ^ b.id.charCodeAt(0)) * 2654435761) >>> 0
    return ha - hb
  })
  return shuffled.slice(0, 6)
}

export default function Inicio({ playerConfig }) {
  const [episodes,    setEpisodes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState(null)
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)
  const sliderRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setIsAdmin(!!u))
    return unsub
  }, [])

  useEffect(() => {
    const fetchEpisodes = async () => {
      const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchEpisodes()
    const interval = setInterval(fetchEpisodes, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Enfocar input al abrir búsqueda
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [searchOpen])

  const isScheduled = (ep) => {
    if (!ep.publishAt) return false
    const pub = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
    return pub > new Date()
  }

  const published = episodes.filter(ep => !isScheduled(ep))
  const visible   = isAdmin ? episodes : published
  const featured  = getFeatured(published)

  // Filtro de búsqueda
  const searchResults = searchQuery.trim()
    ? visible.filter(ep =>
        ep.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.episode?.toString().includes(searchQuery) ||
        ep.season?.toString().includes(searchQuery)
      )
    : []

  const openEpisode = (ep) => {
    setSelected(ep)
    setSearchOpen(false)
    setSearchQuery('')
    const slug = ep.episode ? `C${ep.episode}` : ep.id
    window.location.hash = `/episodio/${slug}`
    document.title = `${ep.title} — RosaTV`
  }

  const closeEpisode = () => {
    setSelected(null)
    window.location.hash = '/inicio'
    document.title = 'RosaTV — La Rosa de Guadalupe'
  }

  useEffect(() => {
    if (episodes.length === 0) return
    const hash = window.location.hash
    const match = hash.match(/#\/episodio\/(.+)/)
    if (match) {
      const ep = episodes.find(e => e.id === match[1] || `C${e.episode}` === match[1])
      if (ep && !isScheduled(ep)) setSelected(ep)
    }
  }, [episodes])

  useEffect(() => {
    const el = sliderRef.current
    if (!el) return
    let startX, scrollLeft, dragging = false
    const onDown = e => { dragging = true; startX = (e.pageX||e.touches?.[0]?.pageX) - el.offsetLeft; scrollLeft = el.scrollLeft; el.style.cursor = 'grabbing' }
    const onUp   = () => { dragging = false; el.style.cursor = 'grab' }
    const onMove = e => { if (!dragging) return; e.preventDefault(); const x = (e.pageX||e.touches?.[0]?.pageX) - el.offsetLeft; el.scrollLeft = scrollLeft - (x - startX) }
    el.addEventListener('mousedown', onDown); el.addEventListener('mouseleave', onUp)
    el.addEventListener('mouseup', onUp); el.addEventListener('mousemove', onMove)
    return () => { el.removeEventListener('mousedown', onDown); el.removeEventListener('mouseleave', onUp); el.removeEventListener('mouseup', onUp); el.removeEventListener('mousemove', onMove) }
  }, [episodes.length])

  if (selected) return <EpisodePlayer episode={selected} onBack={closeEpisode} playerConfig={playerConfig} />
  if (loading)  return <div className={styles.loading}><div className={styles.spinner} /></div>

  return (
    <div className={styles.wrapper}>

      {/* ── BARRA DE BÚSQUEDA ── */}
      <div className={`${styles.searchBar} ${searchOpen ? styles.searchBarOpen : ''}`}>
        <div className={styles.searchInner}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchRef}
            className={styles.searchInput}
            placeholder="Buscar episodios..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
          <button className={styles.searchClose} onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
            Cancelar
          </button>
        </div>

        {/* Resultados */}
        {searchQuery && (
          <div className={styles.searchResults}>
            {searchResults.length === 0 ? (
              <div className={styles.searchEmpty}>Sin resultados para "{searchQuery}"</div>
            ) : (
              searchResults.map(ep => {
                const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
                  ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : null)
                return (
                  <div key={ep.id} className={styles.searchResult} onClick={() => openEpisode(ep)}>
                    {thumb
                      ? <img src={thumb} alt={ep.title} className={styles.searchThumb} />
                      : <div className={styles.searchThumbFallback}>🌹</div>
                    }
                    <div className={styles.searchInfo}>
                      <div className={styles.searchTitle}>{ep.title}</div>
                      <div className={styles.searchMeta}>
                        {ep.season && `T${ep.season} · Ep.${ep.episode} · `}{getPubDate(ep)}
                      </div>
                    </div>
                    <Play size={14} style={{ color: 'var(--rose)', flexShrink: 0 }} />
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Botón lupa — solo cuando búsqueda está cerrada */}
      {!searchOpen && (
        <button className={styles.searchTrigger} onClick={() => setSearchOpen(true)}>
          <Search size={20} />
        </button>
      )}

      {/* ── DESTACADOS ── */}
      {!searchOpen && featured.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>✦</span>
            <h2 className={styles.sectionTitle}>Destacados</h2>
          </div>
          <div className={styles.slider} ref={sliderRef}>
            {featured.map(ep => {
              const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
                ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/hqdefault.jpg` : null)
              return (
                <div key={ep.id} className={styles.featuredCard} onClick={() => openEpisode(ep)}>
                  <div className={styles.featuredThumb}>
                    {thumb ? <img src={thumb} alt={ep.title} className={styles.featuredImg}/> : <div className={styles.thumbFallback}>🌹</div>}
                    <div className={styles.featuredOverlay}><div className={styles.playBtn}><Play size={22} style={{marginLeft:3}}/></div></div>
                    {ep.duration && <div className={styles.durationBadge}>{ep.duration}</div>}
                  </div>
                  <div className={styles.featuredInfo}>
                    {(ep.season||ep.episode) && <div className={styles.epLabel}>T{ep.season} · Ep.{ep.episode}</div>}
                    <div className={styles.featuredTitle}>{ep.title}</div>
                    {getPubDate(ep) && <div className={styles.meta}><Calendar size={10}/> {getPubDate(ep)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── NUEVOS ── */}
      {!searchOpen && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>●</span>
            <h2 className={styles.sectionTitle}>Nuevos</h2>
          </div>
          <div className={styles.newGrid}>
            {visible.map(ep => {
              const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
                ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : null)
              const sched = isScheduled(ep)
              return (
                <div key={ep.id} className={`${styles.newCard} ${sched ? styles.cardScheduled : ''}`} onClick={() => openEpisode(ep)}>
                  <div className={styles.newThumb}>
                    {thumb ? <img src={thumb} alt={ep.title} className={styles.newImg}/> : <div className={styles.thumbFallback}>🌹</div>}
                    {ep.duration && <div className={styles.durationBadge}>{ep.duration}</div>}
                    {sched && isAdmin && <div className={styles.scheduledBadge}><Lock size={9}/> Programado</div>}
                    <div className={styles.newOverlay}><div className={styles.playBtnSm}><Play size={16} style={{marginLeft:2}}/></div></div>
                  </div>
                  <div className={styles.newInfo}>
                    {(ep.season||ep.episode) && <div className={styles.epLabel}>T{ep.season} · Ep.{ep.episode}</div>}
                    <div className={styles.newTitle}>{ep.title}</div>
                    {getPubDate(ep) && <div className={styles.meta}><Calendar size={10}/> {getPubDate(ep)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}
