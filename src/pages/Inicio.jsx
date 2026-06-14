import { useEffect, useState, useRef } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Lock } from 'lucide-react'
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
  return shuffled.slice(0, Math.min(6, shuffled.length))
}

export default function Inicio() {
  const [episodes, setEpisodes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [isAdmin,  setIsAdmin]  = useState(false)
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

  const now = new Date()
  const isScheduled = ep => {
    if (!ep.publishAt) return false
    const pub = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
    return pub > now
  }

  const published = episodes.filter(ep => !isScheduled(ep))
  const visible   = isAdmin ? episodes : published
  const featured  = getFeatured(published)

  // Arrastre horizontal del slider con mouse
  useEffect(() => {
    const el = sliderRef.current
    if (!el) return
    let startX, scrollLeft, dragging = false

    const onDown = e => {
      dragging = true
      startX = (e.pageX || e.touches?.[0]?.pageX) - el.offsetLeft
      scrollLeft = el.scrollLeft
      el.style.cursor = 'grabbing'
    }
    const onUp = () => { dragging = false; el.style.cursor = 'grab' }
    const onMove = e => {
      if (!dragging) return
      e.preventDefault()
      const x = (e.pageX || e.touches?.[0]?.pageX) - el.offsetLeft
      el.scrollLeft = scrollLeft - (x - startX)
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('mouseleave', onUp)
    el.addEventListener('mouseup', onUp)
    el.addEventListener('mousemove', onMove)
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('mouseleave', onUp)
      el.removeEventListener('mouseup', onUp)
      el.removeEventListener('mousemove', onMove)
    }
  }, [featured.length])

  if (selected) return <EpisodePlayer episode={selected} onBack={() => setSelected(null)} />

  if (loading) return (
    <div className={styles.loading}><div className={styles.spinner} /></div>
  )

  if (visible.length === 0) return (
    <div className={styles.empty}>
      <div className={styles.rosette}>
        <svg viewBox="0 0 110 110">
          <defs>
            <radialGradient id="rg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0abfc"/>
              <stop offset="60%" stopColor="#a855f7"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </radialGradient>
          </defs>
          <g transform="translate(55,55)">
            {[0,45,90,135,180,225,270,315].map(a => (
              <ellipse key={a} cx="0" cy="-22" rx="8" ry="16" fill="url(#rg)" opacity=".85" transform={"rotate("+a+")"} />
            ))}
            <circle cx="0" cy="0" r="12" fill="#f5c842"/>
            <circle cx="0" cy="0" r="6" fill="#000"/>
          </g>
        </svg>
      </div>
      <h1 className={styles.emptyTitle}>Aún en Progreso</h1>
      <p className={styles.emptySub}>Estamos preparando algo milagroso para ti</p>
      <div className={styles.dots}><span /><span /><span /></div>
    </div>
  )

  return (
    <div className={styles.wrapper}>

      {/* ── DESTACADOS — slider horizontal ── */}
      {featured.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>✦</span>
            <h2 className={styles.sectionTitle}>Destacados</h2>
          </div>

          <div className={styles.slider} ref={sliderRef}>
            {featured.map(ep => {
              const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
                ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/hqdefault.jpg`
                : null)
              return (
                <div key={ep.id} className={styles.featuredCard} onClick={() => setSelected(ep)}>
                  <div className={styles.featuredThumb}>
                    {thumb
                      ? <img src={thumb} alt={ep.title} className={styles.featuredImg} />
                      : <div className={styles.thumbFallback}>🌹</div>
                    }
                    <div className={styles.featuredOverlay}>
                      <div className={styles.playBtn}><Play size={22} style={{ marginLeft: 3 }} /></div>
                    </div>
                    {ep.duration && <div className={styles.durationBadge}>{ep.duration}</div>}
                  </div>
                  <div className={styles.featuredInfo}>
                    {(ep.season || ep.episode) && (
                      <div className={styles.epLabel}>T{ep.season} · Ep.{ep.episode}</div>
                    )}
                    <div className={styles.featuredTitle}>{ep.title}</div>
                    {getPubDate(ep) && (
                      <div className={styles.meta}><Calendar size={10} /> {getPubDate(ep)}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── NUEVOS — 2 columnas ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>●</span>
          <h2 className={styles.sectionTitle}>Nuevos</h2>
        </div>

        <div className={styles.newGrid}>
          {visible.map(ep => {
            const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
              ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg`
              : null)
            const scheduled = isScheduled(ep)
            return (
              <div
                key={ep.id}
                className={`${styles.newCard} ${scheduled ? styles.cardScheduled : ''}`}
                onClick={() => setSelected(ep)}
              >
                <div className={styles.newThumb}>
                  {thumb
                    ? <img src={thumb} alt={ep.title} className={styles.newImg} />
                    : <div className={styles.thumbFallback}>🌹</div>
                  }
                  {ep.duration && <div className={styles.durationBadge}>{ep.duration}</div>}
                  {scheduled && isAdmin && (
                    <div className={styles.scheduledBadge}><Lock size={9} /> Programado</div>
                  )}
                  <div className={styles.newOverlay}>
                    <div className={styles.playBtnSm}><Play size={16} style={{ marginLeft: 2 }} /></div>
                  </div>
                </div>
                <div className={styles.newInfo}>
                  {(ep.season || ep.episode) && (
                    <div className={styles.epLabel}>T{ep.season} · Ep.{ep.episode}</div>
                  )}
                  <div className={styles.newTitle}>{ep.title}</div>
                  {getPubDate(ep) && (
                    <div className={styles.meta}><Calendar size={10} /> {getPubDate(ep)}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
