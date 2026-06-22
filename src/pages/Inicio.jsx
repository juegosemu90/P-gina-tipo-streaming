import { useEffect, useState, useRef } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, getDoc, doc, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Lock, Search, X, ArrowLeft, ChevronLeft, Check } from 'lucide-react'
import EpisodePlayer from './EpisodePlayer'
import styles from './Inicio.module.css'

// Colores fijos para cada una de las 7 temporadas
const SEASON_COLORS = {
  1: '#f5c842', // amarillo
  2: '#ef4444', // rojo
  3: '#3b82f6', // azul
  4: '#22c55e', // verde
  5: '#a855f7', // morado
  6: '#f97316', // naranja
  7: '#ec4899', // rosa
}
const SEASONS = [1, 2, 3, 4, 5, 6, 7]

const FALLBACK_THUMB = 'https://archive.org/download/LRDG_Images_1/Capitulos/images.jpeg'

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

function parseNum(v) {
  if (v === undefined || v === null || v === '') return null
  const m = String(v).match(/\d+/)
  return m ? parseInt(m[0], 10) : null
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

export default function Inicio({ playerConfig, searchOpen, setSearchOpen }) {
  const [episodes,     setEpisodes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState(null)
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [seasonBanners,setSeasonBanners]= useState({})
  // null = no se ha entrado a ninguna temporada (vista normal de Inicio)
  const [activeSeason, setActiveSeason] = useState(null)
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

  // Cargar imágenes personalizadas de banner por temporada (subidas desde Admin)
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'seasonBanners'))
        if (snap.exists()) setSeasonBanners(snap.data())
      } catch (e) {}
    }
    fetchBanners()
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 150)
  }, [searchOpen])

  const isScheduled = (ep) => {
    if (!ep.publishAt) return false
    const pub = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
    return pub > new Date()
  }

  const published = episodes.filter(ep => !isScheduled(ep))
  const visible   = isAdmin ? episodes : published
  const featured  = getFeatured(published)

  const countBySeason = (s) => visible.filter(ep => parseNum(ep.season) === s).length

  const seasonBannerImg = (s) => {
    if (seasonBanners[s]) return seasonBanners[s]
    const eps = visible.filter(ep => parseNum(ep.season) === s)
    const withThumb = eps.find(ep => ep.thumbnail) || eps.find(ep => getYoutubeId(ep.youtubeUrl))
    if (!withThumb) return null
    return withThumb.thumbnail || `https://img.youtube.com/vi/${getYoutubeId(withThumb.youtubeUrl)}/maxresdefault.jpg`
  }

  const seasonEpisodes = activeSeason
    ? visible
        .filter(ep => parseNum(ep.season) === activeSeason)
        .sort((a, b) => parseNum(a.episode) - parseNum(b.episode))
    : []

  const searchResults = searchQuery.trim().length > 0
    ? visible.filter(ep =>
        ep.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(ep.episode || '').includes(searchQuery) ||
        String(ep.season || '').includes(searchQuery)
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
    window.location.hash = activeSeason ? '/inicio' : '/inicio'
    document.title = 'RosaTV — La Rosa de Guadalupe'
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
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
  }, [episodes.length, activeSeason])

  if (selected) {
    const nextEp = findNextEpisode(visible, selected)
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

  /* ════════════════════════════════════
     VISTA DENTRO DE UNA TEMPORADA
     ════════════════════════════════════ */
  if (activeSeason !== null) {
    const banner = seasonBannerImg(activeSeason)
    const firstEp = seasonEpisodes[0]
    const color = SEASON_COLORS[activeSeason]

    return (
      <div className={styles.detailWrapper}>
        <div className={styles.banner}>
          {banner
            ? <img src={banner} alt="" className={styles.bannerImg} />
            : <div className={styles.bannerFallback} style={{ background: `linear-gradient(135deg, ${color}33, #000)` }} />
          }
          <div className={styles.bannerShade} />
          <button className={styles.backCircle} onClick={() => setActiveSeason(null)}>
            <ChevronLeft size={22} />
          </button>
        </div>

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

        <div className={styles.seasonPicker}>
          {SEASONS.map(s => (
            <button
              key={s}
              className={`${styles.seasonPickerBtn} ${activeSeason === s ? styles.seasonPickerActive : ''}`}
              style={activeSeason === s ? { background: SEASON_COLORS[s], borderColor: SEASON_COLORS[s] } : {}}
              onClick={() => setActiveSeason(s)}
            >
              T{s}
              {activeSeason === s && <Check size={11} />}
            </button>
          ))}
        </div>

        <div className={styles.episodeListLabel} style={{ color }}>TEMPORADA {activeSeason}</div>

        {seasonEpisodes.length === 0 ? (
          <div className={styles.empty}><p>Aún no hay episodios en esta temporada</p></div>
        ) : (
          <div className={styles.episodeList}>
            {seasonEpisodes.map(ep => {
              const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl)
                ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : FALLBACK_THUMB)
              const sched = isScheduled(ep)
              return (
                <div key={ep.id} className={`${styles.episodeRow} ${sched ? styles.episodeRowScheduled : ''}`} onClick={() => openEpisode(ep)}>
                  <div className={styles.episodeThumbWrap}>
                    <img src={thumb} alt={ep.title} className={styles.episodeThumb} />
                    {ep.duration && <div className={styles.episodeDurationBadge}>{ep.duration}</div>}
                    <div className={styles.episodePlayCircle}><Play size={14} fill="#fff" style={{ marginLeft: 1 }} /></div>
                    {sched && isAdmin && <div className={styles.episodeLockBadge}><Lock size={9}/></div>}
                  </div>
                  <div className={styles.episodeInfo}>
                    <div className={styles.episodeTitleRow}>
                      <span className={styles.episodeTitle}>{ep.title}</span>
                    </div>
                    {getPubDate(ep) && <div className={styles.episodeDate}>{getPubDate(ep)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ════════════════════════════════════
     INICIO NORMAL
     ════════════════════════════════════ */
  return (
    <div className={styles.wrapper}>

      {!searchOpen && (
        <button className={styles.searchTrigger} onClick={() => setSearchOpen(true)}>
          <Search size={20} color="white" />
        </button>
      )}

      {searchOpen && (
        <div className={styles.searchScreen}>
          <div className={styles.searchBar}>
            <button className={styles.searchBack} onClick={closeSearch}><ArrowLeft size={20} /></button>
            <div className={styles.searchInputWrap}>
              <Search size={15} className={styles.searchIcon} />
              <input
                ref={searchRef}
                className={styles.searchInput}
                placeholder="Nombre, episodio, temporada..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && <button className={styles.searchClear} onClick={() => setSearchQuery('')}><X size={15} /></button>}
            </div>
          </div>

          <div className={styles.searchFilters}>
            <span className={styles.filterLabel}>Busca por:</span>
            <span className={styles.filterTag}>Nombre</span>
            <span className={styles.filterTag}>Nº Episodio</span>
            <span className={styles.filterTag}>Temporada</span>
          </div>

          <div className={styles.searchResults}>
            {!searchQuery && (
              <div className={styles.searchHint}>
                <Search size={40} style={{ opacity: .2, marginBottom: 12 }} />
                <p>Escribe para buscar episodios</p>
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div className={styles.searchEmpty}>
                <p>Sin resultados para "{searchQuery}"</p>
                <span>Intenta con otro nombre o número</span>
              </div>
            )}
            {searchResults.map(ep => {
              const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl) ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : FALLBACK_THUMB)
              return (
                <div key={ep.id} className={styles.searchResult} onClick={() => openEpisode(ep)}>
                  <div className={styles.searchThumbWrap}>
                    <img src={thumb} alt={ep.title} className={styles.searchThumb} />
                    {ep.duration && <div className={styles.searchDuration}>{ep.duration}</div>}
                  </div>
                  <div className={styles.searchInfo}>
                    {(ep.season || ep.episode) && <div className={styles.searchEpLabel}>T{ep.season} · Ep.{ep.episode}</div>}
                    <div className={styles.searchTitle}>{ep.title}</div>
                    {getPubDate(ep) && <div className={styles.searchMeta}>{getPubDate(ep)}</div>}
                  </div>
                  <Play size={14} style={{ color: 'var(--rose)', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!searchOpen && (
        <>
          {/* ── BOTONES DE TEMPORADA — rectangulares y de color ── */}
          <section className={styles.seasonSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>▣</span>
              <h2 className={styles.sectionTitle}>Temporadas</h2>
            </div>
            <div className={styles.seasonGrid}>
              {SEASONS.map(s => {
                const color = SEASON_COLORS[s]
                return (
                  <button
                    key={s}
                    className={styles.seasonBtn}
                    style={{ background: color }}
                    onClick={() => setActiveSeason(s)}
                  >
                    <span className={styles.seasonBtnNum}>T{s}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {featured.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTag}>✦</span>
                <h2 className={styles.sectionTitle}>Destacados</h2>
              </div>
              <div className={styles.slider} ref={sliderRef}>
                {featured.map(ep => {
                  const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl) ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/hqdefault.jpg` : FALLBACK_THUMB)
                  return (
                    <div key={ep.id} className={styles.featuredCard} onClick={() => openEpisode(ep)}>
                      <div className={styles.featuredThumb}>
                        <img src={thumb} alt={ep.title} className={styles.featuredImg}/>
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

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTag}>●</span>
              <h2 className={styles.sectionTitle}>Nuevos</h2>
            </div>
            <div className={styles.newGrid}>
              {visible.map(ep => {
                const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl) ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/mqdefault.jpg` : FALLBACK_THUMB)
                const sched = isScheduled(ep)
                return (
                  <div key={ep.id} className={`${styles.newCard} ${sched ? styles.cardScheduled : ''}`} onClick={() => openEpisode(ep)}>
                    <div className={styles.newThumb}>
                      <img src={thumb} alt={ep.title} className={styles.newImg}/>
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
        </>
      )}

    </div>
  )
}
