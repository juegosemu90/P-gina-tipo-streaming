import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { Play, Calendar } from 'lucide-react'
import EpisodePlayer from './EpisodePlayer'
import styles from './Inicio.module.css'

export default function Inicio() {
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetch()
  }, [])

  if (selected) {
    return <EpisodePlayer episode={selected} onBack={() => setSelected(null)} />
  }

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
    </div>
  )

  if (episodes.length === 0) return (
    <div className={styles.empty}>
      <div className={styles.rosette}>
        <svg viewBox="0 0 110 110">
          <defs>
            <radialGradient id="rg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0abfc" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>
          </defs>
          <g transform="translate(55,55)">
            {[0,45,90,135,180,225,270,315].map(a => (
              <ellipse key={a} cx="0" cy="-22" rx="8" ry="16" fill="url(#rg)" opacity=".85" transform={"rotate("+a+")"} />
            ))}
            <circle cx="0" cy="0" r="12" fill="#f5c842" />
            <circle cx="0" cy="0" r="6" fill="#000" />
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
      <div className={styles.header}>
        <h1>Episodios</h1>
        <p>{episodes.length} episodio{episodes.length !== 1 ? 's' : ''} disponible{episodes.length !== 1 ? 's' : ''}</p>
      </div>
      <div className={styles.grid}>
        {episodes.map(ep => (
          <div key={ep.id} className={styles.card} onClick={() => setSelected(ep)}>
            <div className={styles.thumb}>
              {getYoutubeId(ep.youtubeUrl) ? (
                <img
                  src={"https://img.youtube.com/vi/"+getYoutubeId(ep.youtubeUrl)+"/mqdefault.jpg"}
                  alt={ep.title}
                  className={styles.thumbImg}
                />
              ) : (
                <div className={styles.thumbFallback}>🌹</div>
              )}
              <div className={styles.overlay}>
                <div className={styles.playBtn}><Play size={20} style={{ marginLeft: 2 }} /></div>
              </div>
            </div>
            <div className={styles.info}>
              {(ep.season || ep.episode) && (
                <div className={styles.epLabel}>T{ep.season} · Ep.{ep.episode}</div>
              )}
              <div className={styles.title}>{ep.title}</div>
              {ep.description && <p className={styles.desc}>{ep.description}</p>}
              {ep.date && (
                <div className={styles.meta}><Calendar size={11} /> {ep.date}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getYoutubeId(url) {
  if (!url) return ''
  const match = url.match(/(?:v=|youtu\.be\/)([^&?\/]+)/)
  return match ? match[1] : ''
}
