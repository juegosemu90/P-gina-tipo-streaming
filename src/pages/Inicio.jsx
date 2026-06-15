import { useEffect, useState, useRef } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Clock, Bell } from 'lucide-react'
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

// Verifica si el episodio está programado (aún no disponible)
function getScheduleInfo(ep) {
  if (!ep.publishAt) return { scheduled: false, reminder: false }
  const pub = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
  const now = new Date()
  const diffMs = pub - now
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  return {
    scheduled: diffMs > 0,          // todavía no está disponible
    reminder: diffDays <= 1 && diffMs > 0, // dentro de menos de 24h
    pub,
    diffDays,
  }
}

function formatCountdown(pub) {
  const now = new Date()
  const diff = pub - now
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `Disponible en ${d} día${d > 1 ? 's' : ''}`
  }
  if (h > 0) return `Disponible en ${h}h ${m}m`
  return `Disponible en ${m} minuto${m !== 1 ? 's' : ''}`
}

export default function Inicio({ playerConfig }) {
  const [episodes, setEpisodes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [isAdmin,  setIsAdmin]  = useState(false)
  const [now,      setNow]      = useState(new Date())
  const sliderRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setIsAdmin(!!u))
    return unsub
  }, [])

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetch()
  }, [])

  // Actualizar el tiempo cada minuto para el countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Abrir episodio con URL
  const openEpisode = (ep) => {
    const info = getScheduleInfo(ep)
    if (info.scheduled) return // no se puede abrir si está programado
    setSelected(ep)
    const slug = ep.episode ? `C${ep.episode}` : ep.id
    window.location.hash = `/episodio/${slug}`
    document.title = `${ep.title} — RosaTV`
  }

  const closeEpisode = () => {
    setSelected(null)
    window.location.hash = '/inicio'
    document.title = 'RosaTV — La Rosa de Guadalupe'
  }

  // Detectar episodio en URL al cargar
  useEffect(() => {
    if (episodes.length === 0) return
    const hash = window.location.hash
    const match = hash.match(/#\/episodio\/(.+)/)
    if (match) {
      const ep = episodes.find(e => e.id === match[1] || `C${e.episode}` === match[1])
      if (ep && !getScheduleInfo(ep).scheduled) setSelected(ep)
    }
  }, [episodes])

  // Arrastre slider
  useEffect(() => {
    const el = sliderRef.current
    if (!el) return
    let startX, scrollLeft, dragging = false
    const onDown = e => { dragging = true; startX = (e.pageX||e.touches?.[0]?.pageX) - el.offsetLeft; scrollLeft = el.scrollLeft; el.style.cursor = 'grabbing' }
    const onUp = () => { dragging = false; el.style.cursor = 'grab' }
    const onMove = e => { if (!dragging) return; e.preventDefault(); const x = (e.pageX||e.touches?.[0]?.pageX) - el.offsetLeft; el.scrollLeft = scrollLeft - (x - startX) }
    el.addEventListener('mousedown', onDown)
    el.addEventListener('mouseleave', onUp)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('mousemove', onMove)
    return () => { el.removeEventListener('mousedown', onDown); el.removeEventListener('mouseleave', onUp); el.removeEventListener('mouseup', onUp); el.removeEventListener('mousemove', onMove) }
  }, [episodes.length])

  const published = episodes.filter(ep => !getScheduleInfo(ep).scheduled)
  // Todos los episodios aparecen — publicados y programados
  const allVisible = episodes
  const featured = getFeatured(published)

  if (selected) return <EpisodePlayer episode={selected} onBack={closeEpisode} playerConfig={playerConfig} />

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>

  if (allVisible.length === 0) return (
    <div className={styles.empty}>
      <div className={styles.rosette}>
        <svg viewBox="0 0 110 110">
          <defs><radialGradient id="rg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f0abfc"/><stop offset="60%" stopColor="#a855f7"/><stop offset="100%" stopColor="#7c3aed"/></radialGradient></defs>
          <g transform="translate(55,55)">{[0,45,90,135,180,225,270,315].map(a=><ellipse key={a} cx="0" cy="-22" rx="8" ry="16" fill="url(#rg)" opacity=".85" transform={`rotate(${a})`}/>)}<circle cx="0" cy="0" r="12" fill="#f5c842"/><circle cx="0" cy="0" r="6" fill="#000"/></g>
        </svg>
      </div>
      <h1 className={styles.emptyTitle}>Aún en Progreso</h1>
      <p className={styles.emptySub}>Estamos preparando algo milagroso para ti</p>
      <div className={styles.dots}><span/><span/><span/></div>
    </div>
  )

  const renderCard = (ep, big = false) => {
    const info = getScheduleInfo(ep)
    const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
      ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/${big ? 'hqdefault' : 'mqdefault'}.jpg`
      : null)
    const countdown = info.scheduled ? formatCountdown(info.pub) : null

    return (
      <div
        key={ep.id}
        className={`${big ? styles.featuredCard : styles.newCard} ${info.scheduled ? styles.cardScheduled : ''}`}
        onClick={() => openEpisode(ep)}
        style={{ cursor: info.scheduled ? 'default' : 'pointer' }}
      >
        <div className={big ? styles.featuredThumb : styles.newThumb}>
          {thumb
            ? <img src={thumb} alt={ep.title} className={big ? styles.featuredImg : styles.newImg} />
            : <div className={styles.thumbFallback}>🌹</div>
          }

          {/* Badge recordatorio — esquina superior derecha */}
          {info.scheduled && (
            <div className={styles.reminderBadge}>
              <Bell size={10} fill="white" />
              Próximamente
            </div>
          )}

          {/* Overlay con countdown si es recordatorio del día */}
          {info.reminder && (
            <div className={styles.countdownOverlay}>
              <div className={styles.countdownBox}>
                <Bell size={14} />
                <span>{countdown}</span>
              </div>
            </div>
          )}

          {/* Overlay oscuro si está programado — sin botón play */}
          {info.scheduled && !info.reminder && (
            <div className={styles.scheduledOverlay}>
              <span className={styles.scheduledDate}>{getPubDate(ep)}</span>
            </div>
          )}

          {ep.duration && !info.scheduled && <div className={styles.durationBadge}>{ep.duration}</div>}

          {/* Play solo si está disponible */}
          {!info.scheduled && (
            <div className={big ? styles.featuredOverlay : styles.newOverlay}>
              <div className={big ? styles.playBtn : styles.playBtnSm}>
                <Play size={big ? 22 : 16} style={{ marginLeft: big ? 3 : 2 }} />
              </div>
            </div>
          )}
        </div>

        <div className={big ? styles.featuredInfo : styles.newInfo}>
          {(ep.season || ep.episode) && <div className={styles.epLabel}>T{ep.season} · Ep.{ep.episode}</div>}
          <div className={big ? styles.featuredTitle : styles.newTitle}>{ep.title}</div>
          {getPubDate(ep) && (
            <div className={styles.meta}>
              <Calendar size={10} />
              {info.scheduled ? `Estreno: ${getPubDate(ep)}` : getPubDate(ep)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>

      {/* ── DESTACADOS ── */}
      {featured.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>✦</span>
            <h2 className={styles.sectionTitle}>Destacados</h2>
          </div>
          <div className={styles.slider} ref={sliderRef}>
            {featured.map(ep => renderCard(ep, true))}
          </div>
        </section>
      )}

      {/* ── TODOS LOS EPISODIOS ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>●</span>
          <h2 className={styles.sectionTitle}>Episodios</h2>
        </div>
        <div className={styles.newGrid}>
          {allVisible.map(ep => renderCard(ep, false))}
        </div>
      </section>

    </div>
  )
}
