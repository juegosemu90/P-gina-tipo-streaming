import { useEffect, useState, useRef } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, getDoc, doc, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Lock, Search, X, ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import EpisodePlayer from './EpisodePlayer'
import FadeInCard from '../components/FadeInCard'
import { getAllProgress } from '../watchProgress'
import styles from './Inicio.module.css'

// Colores fijos para cada página (en vez de temporada)
const PAGE_COLORS = {
  1: '#22b8e8',
  2: '#22b8e8',
  3: '#22b8e8',
  4: '#22b8e8',
  5: '#22b8e8',
  6: '#22b8e8',
  7: '#22b8e8',
}
const PAGE_SIZE = 200

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
  const sorted = [...list].sort((a, b) => (parseNum(a.episode) ?? 0) - (parseNum(b.episode) ?? 0))
  const idx = sorted.findIndex(ep => ep.id === current.id)
  if (idx === -1 || idx + 1 >= sorted.length) return null
  return sorted[idx + 1]
}

export default function Inicio({ playerConfig, searchOpen, setSearchOpen, onWatchingChange }) {
  const [episodes,     setEpisodes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [selected,     setSelected]     = useState(null)
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [pageBanners,  setPageBanners]  = useState({})
  // null = no se ha entrado a ninguna página (vista normal de Inicio)
  const [activePage,   setActivePage]   = useState(null)
  const [expandedEp,   setExpandedEp]   = useState(null)
  const [progressMap,  setProgressMap]  = useState({})
  const [extraCats,    setExtraCats]    = useState([])
  const [activeCategory, setActiveCategory] = useState(null) // categoría extra seleccionada
  const searchRef = useRef(null)
  const sliderRef = useRef(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setIsAdmin(!!u))
    return unsub
  }, [])

  // Cargar el progreso guardado (aros de la lista de episodios) al iniciar
  useEffect(() => {
    setProgressMap(getAllProgress())
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

  // Cargar categorías personalizadas desde Firestore
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        setExtraCats(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) { setExtraCats([]) }
    }
    fetchCats()
  }, [])

  // Cargar imágenes personalizadas de banner por página (subidas desde Admin)
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'pageBanners'))
        if (snap.exists()) setPageBanners(snap.data())
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

  // "Seguir Viendo" — episodios con progreso guardado, sin terminar, más reciente primero
  const continueWatching = Object.entries(progressMap)
    .map(([id, p]) => ({ ep: visible.find(e => e.id === id), p }))
    .filter(x => x.ep)
    .sort((a, b) => (b.p.updatedAt || 0) - (a.p.updatedAt || 0))
    .slice(0, 12)
    .map(x => x.ep)

  // Todos los episodios ordenados por número, sin importar temporada
  const allSorted = [...visible].sort((a, b) => (parseNum(a.episode) ?? 0) - (parseNum(b.episode) ?? 0))
  const totalPages = Math.max(1, Math.ceil(allSorted.length / PAGE_SIZE))
  const PAGES = Array.from({ length: totalPages }, (_, i) => i + 1)

  // ── Definición de temporadas ──
  const SEASON_RANGES = [
    { season: 1, from: 1,   to: 81  },
    { season: 2, from: 82,  to: 168 },
    { season: 3, from: 169, to: 278 },
    { season: 4, from: 279, to: 378 },
    { season: 5, from: 379, to: Infinity },
  ]

  const getSeasonOf = (ep) => {
    const num = ep.season ? parseInt(ep.season) : (parseNum(ep.episode) ?? 0)
    if (ep.season) return parseInt(ep.season)
    const range = SEASON_RANGES.find(r => num >= r.from && num <= r.to)
    return range ? range.season : 1
  }

  // Agrupar episodios de La Rosa por temporada
  const episodesBySeason = SEASON_RANGES.reduce((acc, r) => {
    const eps = allSorted.filter(ep => {
      // Solo episodios sin categoría extra (La Rosa de Guadalupe)
      if (ep.category && ep.category !== '') return false
      return getSeasonOf(ep) === r.season
    })
    if (eps.length > 0) acc.push({ season: r.season, episodes: eps })
    return acc
  }, [])

  const countByPage = (p) => {
    const season = episodesBySeason.find(s => s.season === p)
    return season ? season.episodes.length : 0
  }

  const pageBannerImg = (p) => {
    if (pageBanners[p]) return pageBanners[p]
    const season = episodesBySeason.find(s => s.season === p)
    if (!season) return null
    const eps = season.episodes
    const withThumb = eps.find(ep => ep.thumbnail) || eps.find(ep => getYoutubeId(ep.youtubeUrl))
    if (!withThumb) return null
    return withThumb.thumbnail || `https://img.youtube.com/vi/${getYoutubeId(withThumb.youtubeUrl)}/maxresdefault.jpg`
  }

  // PAGES ahora son los números de temporada que tienen episodios
  const seasonsWithEps = episodesBySeason.map(s => s.season)

  const pageEpisodes = activePage
    ? (episodesBySeason.find(s => s.season === activePage)?.episodes || [])
    : []

  const searchResults = searchQuery.trim().length > 0
    ? visible.filter(ep =>
        ep.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(ep.episode || '').includes(searchQuery)
      )
    : []

  const openEpisode = (ep) => {
    setSelected(ep)
    setSearchOpen(false)
    setSearchQuery('')
    onWatchingChange?.(true)
    const slug = ep.episode ? `C${ep.episode}` : ep.id
    window.location.hash = `/episodio/${slug}`
    document.title = `${ep.title} — RosaTV`
  }

  const closeEpisode = () => {
    setSelected(null)
    onWatchingChange?.(false)
    setProgressMap(getAllProgress()) // refresca los aros con el progreso recién guardado
    window.location.hash = '/inicio'
    document.title = 'RosaTV — La Rosa de Guadalupe'
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
  }

  // Solo se ejecuta UNA VEZ al cargar episodios por primera vez.
  // Antes se re-ejecutaba cada vez que "episodes" se refrescaba (cada 5 min),
  // lo que podía re-seleccionar/pisar el episodio que ya se estaba viendo.
  const initialEpisodeChecked = useRef(false)
  useEffect(() => {
    if (episodes.length === 0) return
    if (initialEpisodeChecked.current) return
    initialEpisodeChecked.current = true
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
  }, [episodes.length, activePage])

  if (selected) {
    const nextEp = findNextEpisode(visible, selected)
    return (
      <EpisodePlayer
        episode={selected}
        onBack={closeEpisode}
        playerConfig={playerConfig}
        nextEpisode={nextEp}
        onPlayNext={(ep) => openEpisode(ep)}
        allEpisodes={allSorted}
        onSelectEpisode={(ep) => openEpisode(ep)}
      />
    )
  }

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>

  /* ════════════════════════════════════
     VISTA DENTRO DE UNA CATEGORÍA EXTRA
     ════════════════════════════════════ */
  if (activeCategory !== null) {
    const catEpisodes = allSorted.filter(ep => ep.category === activeCategory.id)
    const firstEp = catEpisodes[0]
    return (
      <div className={styles.detailWrapper}>
        <div className={styles.detailBgShade} />
        {activeCategory.cover && (
          <div className={styles.detailBg} style={{ backgroundImage: `url(${activeCategory.cover})` }} />
        )}

        {/* Header con nombre de la categoría + X */}
        <div className={styles.simpleHeader}>
          <span className={styles.simpleHeaderTitle}>{activeCategory.name}</span>
          <button className={styles.backCircle2} onClick={() => setActiveCategory(null)}>
            <X size={22} />
          </button>
        </div>

        {/* Versión móvil */}
        <div className={styles.mobileDetailOnly}>
          {activeCategory.thumbnail && (
            <div className={styles.mHeroPoster} onClick={() => firstEp && openEpisode(firstEp)}>
              <img src={activeCategory.thumbnail} alt={activeCategory.name} className={styles.heroPosterImg} />
              {firstEp && <div className={styles.mHeroPlayCircle}><Play size={26} fill="#fff" color="#fff" /></div>}
            </div>
          )}
          <div className={styles.mDivider} />
          {firstEp && (
            <button className={styles.mWatchBtn} onClick={() => openEpisode(firstEp)}>
              <Play size={15} fill="#fff" style={{ marginLeft: -1 }} />
              Ver desde el episodio {firstEp.episode}
            </button>
          )}
          <h1 className={styles.mTitle}>{activeCategory.name}</h1>
          {activeCategory.description && <p className={styles.mDesc}>{activeCategory.description}</p>}
          <div className={styles.mEpisodeList}>
            {catEpisodes.length === 0
              ? <p style={{ color: '#888', padding: '20px', textAlign: 'center', fontSize: 13 }}>No hay episodios en esta categoría aún.</p>
              : catEpisodes.map(ep => (
                <div key={ep.id} className={styles.mEpisodeRow} onClick={() => openEpisode(ep)}>
                  <div className={styles.mEpisodePlayCircle}><Play size={13} fill="#fff" color="#fff" style={{ marginLeft: 1 }} /></div>
                  <span className={styles.mEpisodeNum}>EP {ep.episode || '?'}</span>
                  <span className={styles.mEpisodeTitle}>{ep.title}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Versión escritorio */}
        <div className={styles.desktopDetailOnly}>
          <div className={styles.detailTopGrid}>
            {activeCategory.thumbnail && (
              <div className={styles.heroPoster}>
                <img src={activeCategory.thumbnail} alt={activeCategory.name} className={styles.heroPosterImg} />
              </div>
            )}
            <div className={styles.detailTopInfo}>
              <div className={styles.simpleInfo}>
                <h1 className={styles.simpleTitle}>{activeCategory.name}</h1>
              </div>
              {activeCategory.description && (
                <div className={styles.simpleDesc}>
                  <p>{activeCategory.description}</p>
                </div>
              )}
            </div>
          </div>
          <div className={styles.episodeList}>
            {catEpisodes.length === 0
              ? <div className={styles.detailEmpty}><p>No hay episodios en esta categoría aún.</p></div>
              : catEpisodes.map(ep => {
                const isExpanded = expandedEp === ep.id
                return (
                  <div
                    key={ep.id}
                    className={`${styles.episodeRow2} ${isExpanded ? styles.episodeRowExpanded : ''}`}
                    onClick={() => setExpandedEp(isExpanded ? null : ep.id)}
                  >
                    <div className={styles.episodeRow2Top}>
                      <div className={styles.episodePlayCircle2}>
                        <Play size={14} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />
                      </div>
                      <div className={styles.episodeRow2Info}>
                        <span className={styles.episodeRow2Title}>{ep.episode || '?'} · {ep.title}</span>
                        {ep.duration && <span className={styles.episodeRow2Duration}>{ep.duration}</span>}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className={styles.episodeExpand}>
                        {ep.description && <p className={styles.episodeDesc}>{ep.description}</p>}
                        <button className={styles.watchNowBtn} onClick={e => { e.stopPropagation(); openEpisode(ep) }}>
                          <Play size={12} fill="#fff" style={{ marginLeft: -1 }} /> Ver ahora
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════
     VISTA DENTRO DE UNA PÁGINA
     ════════════════════════════════════ */
  if (activePage !== null) {
    const banner = pageBannerImg(activePage)
    const bgBanner = pageBannerImg(2) || 'https://archive.org/download/La-rosana-90/portada/Temporada%202.jpg'
    const firstEp = pageEpisodes[0]
    const color = PAGE_COLORS[((activePage - 1) % 7) + 1]

    return (
      <div className={styles.detailWrapper}>
        {bgBanner && (
          <div className={styles.detailBg} style={{ backgroundImage: `url(${bgBanner})` }} />
        )}
        <div className={styles.detailBgShade} />

        {/* ── Header simple: nombre de la sección + X para salir ── */}
        <div className={styles.simpleHeader}>
          <span className={styles.simpleHeaderTitle}>La Rosa de Guadalupe</span>
          <button className={styles.backCircle2} onClick={() => setActivePage(null)}>
            <X size={22} />
          </button>
        </div>

        {/* ════════ VERSIÓN MÓVIL ════════ */}
        <div className={styles.mobileDetailOnly}>

          {/* Banner con play centrado */}
          {banner && (
            <div
              className={styles.mHeroPoster}
              onClick={() => firstEp && openEpisode(firstEp)}
            >
              <img src={banner} alt="" className={styles.heroPosterImg} />
              <div className={styles.mHeroPlayCircle}><Play size={26} fill="#fff" color="#fff" /></div>
            </div>
          )}

          <div className={styles.mDivider} />

          {firstEp && (
            <button className={styles.mWatchBtn} onClick={() => openEpisode(firstEp)}>
              <Play size={15} fill="#fff" style={{ marginLeft: -1 }} />
              TEMPORADA {activePage} EPISODIO {firstEp.episode}
            </button>
          )}

          <h1 className={styles.mTitle}>La Rosa de Guadalupe</h1>

          <div className={styles.mTagsRow}>
            <span className={styles.mTag}>B</span>
            <span className={styles.mTag}>{seasonsWithEps.length} TEMPORADA{seasonsWithEps.length !== 1 ? 'S' : ''}</span>
          </div>

          <p className={styles.mDesc}>
            Una serie de historias de fe y milagros protagonizadas por personas comunes
            que encuentran en la Virgen de Guadalupe su única esperanza.
          </p>

          {seasonsWithEps.length > 1 && (
            <div className={styles.mSeasonRow}>
              {seasonsWithEps.map(p => (
                <button
                  key={p}
                  className={`${styles.mSeasonBtn} ${activePage === p ? styles.mSeasonBtnActive : ''}`}
                  onClick={() => setActivePage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {pageEpisodes.length === 0 ? (
            <div className={styles.detailEmpty}><p>Aún no hay episodios en esta página</p></div>
          ) : (
            <div className={styles.mEpisodeList}>
              {pageEpisodes.map(ep => {
                const sched = isScheduled(ep)
                return (
                  <div
                    key={ep.id}
                    className={`${styles.mEpisodeRow} ${sched ? styles.episodeRowScheduled : ''}`}
                    onClick={() => !sched && openEpisode(ep)}
                  >
                    <div className={styles.mEpisodePlayCircle}>
                      <Play size={13} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />
                    </div>
                    <span className={styles.mEpisodeNum}>EP {ep.episode || '?'}</span>
                    <span className={styles.mEpisodeTitle}>{ep.title}</span>
                    {sched && isAdmin && <Lock size={12} className={styles.episodeLockIcon} />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ════════ VERSIÓN ESCRITORIO (la de siempre) ════════ */}
        <div className={styles.desktopDetailOnly}>

          {/* ── Bloque superior: miniatura a la izquierda + info a la derecha ── */}
          <div className={styles.detailTopGrid}>

            {banner && (
              <div className={styles.heroPoster}>
                <img src={banner} alt="" className={styles.heroPosterImg} />
                <div className={styles.heroPosterShade} />
              </div>
            )}

            <div className={styles.detailTopInfo}>
              <div className={styles.simpleInfo}>
                <h1 className={styles.simpleTitle}>La Rosa de Guadalupe</h1>
                <p className={styles.simpleMeta}>
                  {seasonsWithEps.length} temporada{seasonsWithEps.length !== 1 ? 's' : ''} · {allSorted.length} episodios
                </p>
              </div>

              <div className={styles.simpleDesc}>
                <p>
                  Una serie de historias de fe y milagros protagonizadas por personas comunes que encuentran
                  en la Virgen de Guadalupe su única esperanza.
                </p>
                <p className={styles.simpleDescMeta}>
                  ELENCO: José Ángel García, Marta Luna, Ricardo de la Parra, Gastón Tuset.
                </p>
                <p className={styles.simpleDescMeta}>
                  PRODUCTOR: Miguel Ángel Herros.
                </p>
              </div>
            </div>
          </div>

          {/* ── Selector de temporada ── */}
          {seasonsWithEps.length > 1 && (
            <div className={styles.pageTabsOuter}>
              <div className={styles.pageTabsSpacer} />
              <div className={styles.pageTabsRow}>
                <span className={styles.pageTabsLabel}>TEMPORADA</span>
                <div className={styles.pageTabs}>
                  {seasonsWithEps.map(p => (
                    <button
                      key={p}
                      className={`${styles.pageTabBtn} ${activePage === p ? styles.pageTabBtnActive : ''}`}
                      style={activePage === p ? { color, borderColor: color } : {}}
                      onClick={() => setActivePage(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {pageEpisodes.length === 0 ? (
            <div className={styles.detailEmpty}><p>Aún no hay episodios en esta página</p></div>
          ) : (
            <div className={styles.episodeList}>
              {pageEpisodes.map(ep => {
                const sched = isScheduled(ep)
                const isExpanded = expandedEp === ep.id
                return (
                  <div
                    key={ep.id}
                    className={`${styles.episodeRow2} ${sched ? styles.episodeRowScheduled : ''} ${isExpanded ? styles.episodeRowExpanded : ''}`}
                    onClick={() => setExpandedEp(isExpanded ? null : ep.id)}
                  >
                    <div className={styles.episodeRow2Top}>
                      <div className={styles.episodePlayCircle2} style={{ '--watched': progressMap[ep.id]?.pct || 0 }}>
                        <Play size={14} fill="#fff" color="#fff" style={{ marginLeft: 1 }} />
                      </div>
                      <div className={styles.episodeRow2Info}>
                        <span className={styles.episodeRow2Title}>
                          {ep.episode || '?'} · {ep.title}
                        </span>
                        {ep.duration && <span className={styles.episodeRow2Duration}>{ep.duration}</span>}
                      </div>
                      {sched && isAdmin && <Lock size={12} className={styles.episodeLockIcon} />}
                    </div>

                    {isExpanded && (
                      <div className={styles.episodeExpand}>
                        {ep.description && <p className={styles.episodeDesc}>{ep.description}</p>}
                        <button
                          className={styles.watchNowBtn}
                          onClick={e => { e.stopPropagation(); openEpisode(ep) }}
                        >
                          <Play size={12} fill="#fff" style={{ marginLeft: -1 }} />
                          Ver ahora
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════
     INICIO NORMAL
     ════════════════════════════════════ */
  return (
    <div className={styles.wrapper}>

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
                    {ep.episode && <div className={styles.searchEpLabel}>Ep. {ep.episode}</div>}
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
          {/* ── CATEGORÍAS ── */}
          <section className={styles.catSection}>
            <h2 className={styles.newSectionTitle}>Categorías</h2>
            <div className={styles.catSlider}>
              {/* Tarjeta fija: La Rosa de Guadalupe (categoría por defecto) */}
              <FadeInCard className={styles.catCard} delay={0} onClick={() => setActivePage(seasonsWithEps[0] || 1)}>
                <div className={styles.catImgWrap}>
                  {pageBannerImg(seasonsWithEps[0] || 1)
                    ? <img src={pageBannerImg(seasonsWithEps[0] || 1)} alt="La Rosa de Guadalupe" className={styles.catImg} />
                    : <div className={styles.catFallback}><span className={styles.catNum}>{allSorted.length}</span></div>
                  }
                  <div className={styles.catShade} />
                </div>
                <div className={styles.catInfo}>
                  <span className={styles.catTitle}>La Rosa de Guadalupe</span>
                  <span className={styles.catMeta}>{allSorted.length} episodios</span>
                </div>
              </FadeInCard>

              {/* Categorías extra creadas desde Admin */}
              {extraCats.map((cat, i) => (
                <FadeInCard key={cat.id} className={styles.catCard} delay={(i + 1) * 60} onClick={() => setActiveCategory(cat)}>
                  <div className={styles.catImgWrap}>
                    {cat.thumbnail
                      ? <img src={cat.thumbnail} alt={cat.name} className={styles.catImg} />
                      : <div className={styles.catFallback}><span className={styles.catNum}>{cat.name.slice(0,2).toUpperCase()}</span></div>
                    }
                    <div className={styles.catShade} />
                  </div>
                  <div className={styles.catInfo}>
                    <span className={styles.catTitle}>{cat.name}</span>
                    {cat.description && <span className={styles.catMeta}>{cat.description.slice(0, 40)}</span>}
                  </div>
                </FadeInCard>
              ))}
            </div>
          </section>

          {/* ── SEGUIR VIENDO ── */}
          {continueWatching.length > 0 && (
            <section className={styles.newSection}>
              <h2 className={styles.newSectionTitle}>Seguir Viendo</h2>
              <div className={styles.newSlider}>
                {continueWatching.map((ep, i) => {
                  const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl) ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/hqdefault.jpg` : FALLBACK_THUMB)
                  const pct = progressMap[ep.id]?.pct || 0
                  return (
                    <FadeInCard key={ep.id} className={styles.newCard16} delay={i * 60} onClick={() => openEpisode(ep)}>
                      <div className={styles.newThumb16}>
                        <img src={thumb} alt={ep.title} className={styles.newThumbImg} />
                        <div className={styles.newThumbOverlay}>
                          <div className={styles.newPlayCircle}><Play size={16} fill="#fff" color="#fff" style={{marginLeft:2}}/></div>
                        </div>
                        <div className={styles.newProgressTrack}>
                          <div className={styles.newProgressFill} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className={styles.newCardInfo}>
                        <span className={styles.newEpLabel}>EP {ep.episode || '?'}</span>
                        <span className={styles.newCardTitle}>{ep.title}</span>
                      </div>
                    </FadeInCard>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── DESTACADOS ── */}
          {featured.length > 0 && (
            <section className={styles.newSection}>
              <h2 className={styles.newSectionTitle}>Destacados</h2>
              <div className={styles.newSlider} ref={sliderRef}>
                {featured.map((ep, i) => {
                  const thumb = ep.thumbnail || (getYoutubeId(ep.youtubeUrl) ? `https://img.youtube.com/vi/${getYoutubeId(ep.youtubeUrl)}/hqdefault.jpg` : FALLBACK_THUMB)
                  const epNum = parseNum(ep.episode)
                  return (
                    <FadeInCard key={ep.id} className={styles.newCard16} delay={i * 60} onClick={() => openEpisode(ep)}>
                      <div className={styles.newThumb16}>
                        <img src={thumb} alt={ep.title} className={styles.newThumbImg} />
                        {epNum && <span className={styles.newThumbNum}>{epNum}</span>}
                        <div className={styles.newThumbOverlay}>
                          <div className={styles.newPlayCircle}><Play size={16} fill="#fff" color="#fff" style={{marginLeft:2}}/></div>
                        </div>
                        {ep.duration && <div className={styles.durationBadge}>{ep.duration}</div>}
                      </div>
                      <div className={styles.newCardInfo}>
                        {ep.episode && <span className={styles.newEpLabel}>EP {ep.episode}</span>}
                        <span className={styles.newCardTitle}>{ep.title}</span>
                      </div>
                    </FadeInCard>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

    </div>
  )
}
