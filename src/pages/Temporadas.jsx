import { useEffect, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Lock, ChevronDown, Check, X } from 'lucide-react'
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

function parseSeason(value) {
  if (value === undefined || value === null || value === '') return null
  const match = String(value).match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

export default function Temporadas({ playerConfig }) {
  const [episodes,     setEpisodes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState(null)
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [activeSeason, setActiveSeason] = useState(1)
  const [pickerOpen,   setPickerOpen]   = useState(false)

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

  const seasonEpisodes = visibleEpisodes
    .filter(ep => parseSeason(ep.season) === activeSeason)
    .sort((a, b) => {
      const epA = parseInt(String(a.episode || '0').match(/\d+/)?.[0] || '0', 10)
      const epB = parseInt(String(b.episode || '0').match(/\d+/)?.[0] || '0', 10)
      return epA - epB
    })

  const countBySeason = (s) => visibleEpisodes.filter(ep => parseSeason(ep.season) === s).length

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

  const selectSeason = (s) => {
    setActiveSeason(s)
    setPickerOpen(false)
  }

  if (selected) return <EpisodePlayer episode={selected} onBack={closeEpisode} playerConfig={playerConfig} />
  if (loading)  return <div className={styles.loading}><div className={styles.spinner} /></div>

  return (
    <div className={styles.wrapper}>

      {/* ── BOTÓN SELECTOR DE TEMPORADA ── */}
      <button className={styles.seasonSelector} onClick={() => setPickerOpen(true)}>
        <span className={styles.seasonSelectorText}>
          Temporada {activeSeason}
          {countBySeason(activeSeason) > 0 && (
            <span className={styles.seasonSelectorCount}>{countBySeason(activeSeason)} episodios</span>
          )}
        </span>
        <ChevronDown size={18} />
      </button>

      {/* ── MODAL DE SELECCIÓN DE TEMPORADA ── */}
      {pickerOpen && (
        <div className={styles.modalOverlay} onClick={() => setPickerOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Selecciona una temporada</h3>
              <button className={styles.modalClose} onClick={() => setPickerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalList}>
              {SEASONS.map(s => (
                <button
                  key={s}
                  className={`${styles.modalItem} ${activeSeason === s ? styles.modalItemActive : ''}`}
                  onClick={() => selectSeason(s)}
                >
                  <span className={styles.modalItemLabel}>Temporada {s}</span>
                  <div className={styles.modalItemRight}>
                    {countBySeason(s) > 0 && (
                      <span className={styles.modalItemCount}>{countBySeason(s)} ep.</span>
                    )}
                    {activeSeason === s && <Check size={16} className={styles.modalCheck} />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EPISODIOS EN FILAS HORIZONTALES ── */}
      <div className={styles.content}>
        {seasonEpisodes.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🌹</div>
            <h3>Sin episodios en esta temporada</h3>
            <p>Aún no se han subido capítulos de la Temporada {activeSeason}</p>
          </div>
        ) : (
          <div className={styles.list}>
            {seasonEpisodes.map(ep => {
              const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
                ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : null)
              const sched = isScheduled(ep)
              return (
                <div
                  key={ep.id}
                  className={`${styles.row} ${sched ? styles.rowScheduled : ''}`}
                  onClick={() => openEpisode(ep)}
                >
                  <div className={styles.rowThumb}>
                    {thumb
                      ? <img src={thumb} alt={ep.title} className={styles.rowThumbImg} />
                      : <div className={styles.rowThumbFallback}>🌹</div>
                    }
                    {ep.duration && <div className={styles.rowDuration}>{ep.duration}</div>}
                    {sched && isAdmin && (
                      <div className={styles.rowScheduledBadge}><Lock size={9}/></div>
                    )}
                    <div className={styles.rowOverlay}>
                      <div className={styles.rowPlayBtn}><Play size={16} style={{ marginLeft: 2 }} /></div>
                    </div>
                  </div>

                  <div className={styles.rowInfo}>
                    <div className={styles.rowEpNum}>Episodio {ep.episode || '?'}</div>
                    <div className={styles.rowTitle}>{ep.title}</div>
                    {ep.description && <p className={styles.rowDesc}>{ep.description}</p>}
                    <div className={styles.rowMeta}>
                      {getPubDate(ep) && <span><Calendar size={10} style={{ marginRight: 3 }} />{getPubDate(ep)}</span>}
                    </div>
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
