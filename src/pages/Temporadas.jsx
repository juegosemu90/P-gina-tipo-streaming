import { useEffect, useState } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Lock, ChevronLeft, Check } from 'lucide-react'
import EpisodePlayer from './EpisodePlayer'
import styles from './Temporadas.module.css'

const SEASONS = [1, 2, 3, 4, 5, 6, 7]

function getYoutubeId(url) {
  if (!url) return ''
  const m = url.match(/(?:v=|youtu\.be\/)([^&?\/]+)/)
  return m ? m[1] : ''
}

function parseNum(v) {
  if (v === undefined || v === null || v === '') return null
  const m = String(v).match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

function findNextEpisode(list, current) {
  const curSeason = parseNum(current.season)
  const curEp = parseNum(current.episode)
  if (curSeason === null || curEp === null) return null

  const sameSeasonSorted = list
    .filter(ep => parseNum(ep.season) === curSeason)
    .sort((a, b) => parseNum(a.episode) - parseNum(b.episode))

  const idx = sameSeasonSorted.findIndex(ep => ep.id === current.id)
  if (idx === -1) return null

  if (idx + 1 < sameSeasonSorted.length) return sameSeasonSorted[idx + 1]

  const nextSeasonEps = list
    .filter(ep => parseNum(ep.season) === curSeason + 1)
    .sort((a, b) => parseNum(a.episode) - parseNum(b.episode))

  return nextSeasonEps[0] || null
}

export default function Temporadas({ playerConfig }) {
  const [episodes,     setEpisodes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState(null)
  const [isAdmin,      setIsAdmin]      = useState(false)
  // null = pantalla de selección de las 7 temporadas (menú principal)
  // número = dentro de esa temporada (vista tipo banner)
  const [activeSeason, setActiveSeason] = useState(null)

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

  const countBySeason = (s) => visibleEpisodes.filter(ep => parseNum(ep.season) === s).length

  const seasonEpisodes = activeSeason
    ? visibleEpisodes
        .filter(ep => parseNum(ep.season) === activeSeason)
        .sort((a, b) => parseNum(a.episode) - parseNum(b.episode))
    : []

  // Miniatura representativa de la temporada (primer episodio con thumbnail)
  const seasonBanner = (s) => {
    const eps = visibleEpisodes.filter(ep => parseNum(ep.season) === s)
    const withThumb = eps.find(ep => ep.thumbnail) || eps.find(ep => getYoutubeId(ep.youtubeUrl))
    if (!withThumb) return null
    return withThumb.thumbnail || `https://img.youtube.com/vi/${getYoutubeId(withThumb.youtubeUrl)}/maxresdefault.jpg`
  }

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

  if (selected) {
    const nextEp = findNextEpisode(visibleEpisodes, selected)
    return (
      <EpisodePlayer
        episode={selected}
        onBack={closeEpisode}
        playerConfig={playerConfig}
        nextEpisode={nextEp}
        onPlayNext={(ep) => openEpisode(ep)}
      />
    )
  }

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>

  /* ════════════════════════════════════════
     MENÚ PRINCIPAL — 7 botones de temporada
     ════════════════════════════════════════ */
  if (activeSeason === null) {
    return (
      <div className={styles.menuWrapper}>
        <div className={styles.menuHeader}>
          <h1 className={styles.menuTitle}>Temporadas</h1>
          <p className={styles.menuSub}>Elige una temporada para ver sus episodios</p>
        </div>

        <div className={styles.seasonGrid}>
          {SEASONS.map(s => {
            const banner = seasonBanner(s)
            const count = countBySeason(s)
            return (
              <button
                key={s}
                className={styles.seasonCard}
                onClick={() => setActiveSeason(s)}
              >
                <div className={styles.seasonCardBg}>
                  {banner
                    ? <img src={banner} alt={`Temporada ${s}`} className={styles.seasonCardImg} />
                    : <div className={styles.seasonCardFallback}>🌹</div>
                  }
                  <div className={styles.seasonCardShade} />
                </div>
                <div className={styles.seasonCardInfo}>
                  <span className={styles.seasonCardNum}>Temporada {s}</span>
                  <span className={styles.seasonCardCount}>
                    {count > 0 ? `${count} episodios` : 'Próximamente'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════
     VISTA DE TEMPORADA — banner + lista
     ════════════════════════════════════════ */
  const banner = seasonBanner(activeSeason)
  const firstEp = seasonEpisodes[0]

  return (
    <div className={styles.detailWrapper}>

      {/* ── Banner superior ── */}
      <div className={styles.banner}>
        {banner
          ? <img src={banner} alt="" className={styles.bannerImg} />
          : <div className={styles.bannerFallback} />
        }
        <div className={styles.bannerShade} />
        <button className={styles.backCircle} onClick={() => setActiveSeason(null)}>
          <ChevronLeft size={22} />
        </button>
      </div>

      {/* ── Info de la temporada ── */}
      <div className={styles.detailInfo}>
        <h1 className={styles.detailTitle}>La Rosa de Guadalupe</h1>
        <p className={styles.detailMeta}>
          Temporada {activeSeason} · {seasonEpisodes.length} episodio{seasonEpisodes.length !== 1 ? 's' : ''}
        </p>

        {firstEp && (
          <button className={styles.playBtnBig} onClick={() => openEpisode(firstEp)}>
            <Play size={16} fill="#000" style={{ marginLeft: -2 }} />
            Reproducir
          </button>
        )}
      </div>

      {/* ── Selector rápido de temporada ── */}
      <div className={styles.seasonPicker}>
        {SEASONS.map(s => (
          <button
            key={s}
            className={`${styles.seasonPickerBtn} ${activeSeason === s ? styles.seasonPickerActive : ''}`}
            onClick={() => setActiveSeason(s)}
          >
            T{s}
            {activeSeason === s && <Check size={11} />}
          </button>
        ))}
      </div>

      {/* ── Lista de episodios ── */}
      <div className={styles.episodeListLabel}>TEMPORADA {activeSeason}</div>

      {seasonEpisodes.length === 0 ? (
        <div className={styles.empty}>
          <p>Aún no hay episodios en esta temporada</p>
        </div>
      ) : (
        <div className={styles.episodeList}>
          {seasonEpisodes.map(ep => {
            const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
              ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : null)
            const sched = isScheduled(ep)
            return (
              <div
                key={ep.id}
                className={`${styles.episodeRow} ${sched ? styles.episodeRowScheduled : ''}`}
                onClick={() => openEpisode(ep)}
              >
                <div className={styles.episodeThumbWrap}>
                  {thumb
                    ? <img src={thumb} alt={ep.title} className={styles.episodeThumb} />
                    : <div className={styles.episodeThumbFallback}>🌹</div>
                  }
                  <div className={styles.episodePlayCircle}>
                    <Play size={13} fill="#fff" style={{ marginLeft: 1 }} />
                  </div>
                  {sched && isAdmin && (
                    <div className={styles.episodeLockBadge}><Lock size={9}/></div>
                  )}
                </div>

                <div className={styles.episodeInfo}>
                  <div className={styles.episodeTitleRow}>
                    <span className={styles.episodeNum}>{ep.episode || '?'}</span>
                    <span className={styles.episodeDash}>-</span>
                    <span className={styles.episodeTitle}>{ep.title}</span>
                  </div>
                  {ep.duration && (
                    <div className={styles.episodeDuration}>~{ep.duration} MIN</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
