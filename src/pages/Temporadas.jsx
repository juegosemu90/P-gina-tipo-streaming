import { useEffect, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Lock } from 'lucide-react'
import EpisodePlayer from './EpisodePlayer'
import styles from './Temporadas.module.css'

const SEASONS = [1, 2, 3, 4, 5, 6, 7]

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

// Extrae el número de temporada sin importar si viene como "1", " 1", 1, "T1", etc.
function parseSeason(value) {
  if (value === undefined || value === null || value === '') return null
  const match = String(value).match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

export default function Temporadas({ playerConfig }) {
  const [episodes,      setEpisodes]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)
  const [isAdmin,       setIsAdmin]       = useState(false)
  const [activeSeason,  setActiveSeason]  = useState(1) // Temporada 1 por defecto

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
  }, [])

  const isScheduled = (ep) => {
    if (!ep.publishAt) return false
    const pub = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
    return pub > new Date()
  }

  const visibleEpisodes = isAdmin ? episodes : episodes.filter(ep => !isScheduled(ep))

  // Filtrar por temporada activa (usando el parser flexible) y ordenar por número de episodio
  const seasonEpisodes = visibleEpisodes
    .filter(ep => parseSeason(ep.season) === activeSeason)
    .sort((a, b) => {
      const epA = parseInt(String(a.episode || '0').match(/\d+/)?.[0] || '0', 10)
      const epB = parseInt(String(b.episode || '0').match(/\d+/)?.[0] || '0', 10)
      return epA - epB
    })

  const openEpisode = (ep) => {
    setSelected(ep)
    const slug = ep.episode ? `C${ep.episode}` : ep.id
    window.location.hash = `/episodio/${slug}`
    document.title = `${ep.title} — RosaTV`
  }

  const closeEpisode = () => {
    setSelected(null)
    window.location.hash = '/temporadas'
    document.title = 'RosaTV — La Rosa de Guadalupe'
  }

  if (selected) return <EpisodePlayer episode={selected} onBack={closeEpisode} playerConfig={playerConfig} />
  if (loading)  return <div className={styles.loading}><div className={styles.spinner} /></div>

  const countBySeason = (s) => visibleEpisodes.filter(ep => parseSeason(ep.season) === s).length

  return (
    <div className={styles.wrapper}>

      {/* ── BARRA DE TEMPORADAS — fija debajo de la navbar ── */}
      <div className={styles.seasonBar}>
        {SEASONS.map(s => (
          <button
            key={s}
            className={`${styles.seasonTab} ${activeSeason === s ? styles.seasonTabActive : ''}`}
            onClick={() => setActiveSeason(s)}
          >
            Temporada {s}
            {countBySeason(s) > 0 && (
              <span className={styles.seasonCount}>{countBySeason(s)}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── EPISODIOS DE LA TEMPORADA ── */}
      <div className={styles.content}>
        {seasonEpisodes.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🌹</div>
            <h3>Sin episodios en esta temporada</h3>
            <p>Aún no se han subido capítulos de la Temporada {activeSeason}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {seasonEpisodes.map(ep => {
              const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
                ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : null)
              const sched = isScheduled(ep)
              return (
                <div
                  key={ep.id}
                  className={`${styles.card} ${sched ? styles.cardScheduled : ''}`}
                  onClick={() => openEpisode(ep)}
                >
                  <div className={styles.thumb}>
                    {thumb
                      ? <img src={thumb} alt={ep.title} className={styles.thumbImg} />
                      : <div className={styles.thumbFallback}>🌹</div>
                    }
                    {ep.duration && <div className={styles.durationBadge}>{ep.duration}</div>}
                    {sched && isAdmin && <div className={styles.scheduledBadge}><Lock size={9}/> Programado</div>}
                    <div className={styles.overlay}>
                      <div className={styles.playBtn}><Play size={18} style={{ marginLeft: 2 }} /></div>
                    </div>
                  </div>
                  <div className={styles.info}>
                    <div className={styles.epLabel}>Ep. {ep.episode || '?'}</div>
                    <div className={styles.title}>{ep.title}</div>
                    {getPubDate(ep) && (
                      <div className={styles.meta}><Calendar size={10} /> {getPubDate(ep)}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
