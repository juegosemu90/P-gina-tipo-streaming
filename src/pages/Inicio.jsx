import { useEffect, useState, useRef } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, getDoc, doc, orderBy, query } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Play, Calendar, Lock, Search, X, ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import EpisodePlayer from './EpisodePlayer'
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

  // Todos los episodios ordenados por número, sin importar temporada
  const allSorted = [...visible].sort((a, b) => (parseNum(a.episode) ?? 0) - (parseNum(b.episode) ?? 0))
  const totalPages = Math.max(1, Math.ceil(allSorted.length / PAGE_SIZE))
  const PAGES = Array.from({ length: totalPages }, (_, i) => i + 1)

  const countByPage = (p) => {
    const start = (p - 1) * PAGE_SIZE
    return allSorted.slice(start, start + PAGE_SIZE).length
  }

  const pageBannerImg = (p) => {
    if (pageBanners[p]) return pageBanners[p]
    const start = (p - 1) * PAGE_SIZE
    const eps = allSorted.slice(start, start + PAGE_SIZE)
    const withThumb = eps.find(ep => ep.thumbnail) || eps.find(ep => getYoutubeId(ep.youtubeUrl))
    if (!withThumb) return null
    return withThumb.thumbnail || `https://img.youtube.com/vi/${getYoutubeId(withThumb.youtubeUrl)}/maxresdefault.jpg`
  }

  const pageEpisodes = activePage
    ? allSorted.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE)
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
      />
    )
  }

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /></div>

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

        {/* ── Header simple: solo back ── */}
        <div className={styles.simpleHeader}>
          <button className={styles.backCircle2} onClick={() => setActivePage(null)}>
            <ChevronLeft size={22} />
          </button>
        </div>

        {/* ── Título y meta ── */}
        <div className={styles.simpleInfo}>
          <h1 className={styles.simpleTitle}>La Rosa de Guadalupe</h1>
          <p className={styles.simpleMeta}>
            {PAGES.length} bloque{PAGES.length !== 1 ? 's' : ''} · {allSorted.length} episodios
          </p>
        </div>

        {/* ── Imagen de la serie — solo miniatura, sin botón de play encima ── */}
        {banner && (
          <div className={styles.heroPoster}>
            <img src={banner} alt="" className={styles.heroPosterImg} />
            <div className={styles.heroPosterShade} />
          </div>
        )}

        {/* ── Sinopsis ── */}
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

        {/* ── Selector de página — solo números, estilo TEMPORADA 1 2 3 4 ── */}
        {PAGES.length > 1 && (
          <div className={styles.pageTabsRow}>
            <span className={styles.pageTabsLabel}>EPISODIOS</span>
            <div className={styles.pageTabs}>
              {PAGES.map(p => (
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
          {/* ── BOTÓN PÓSTER — La Rosa de Guadalupe ── */}
          <section className={styles.posterSection}>
            <button className={styles.posterBtn} onClick={() => setActivePage(1)}>
              <div className={styles.posterImgWrap}>
                {pageBannerImg(1)
                  ? <img src={pageBannerImg(1)} alt="La Rosa de Guadalupe" className={styles.posterImg} />
                  : <div className={styles.posterFallback}>🌹</div>
                }
                <div className={styles.posterShade} />
              </div>
              <div className={styles.posterInfo}>
                <span className={styles.posterTitle}>La Rosa de Guadalupe</span>
                <span className={styles.posterMeta}>{allSorted.length} episodios</span>
              </div>
            </button>
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
                        {ep.episode && <div className={styles.epLabel}>Ep. {ep.episode}</div>}
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
                      {ep.episode && <div className={styles.epLabel}>Ep. {ep.episode}</div>}
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
