import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, updateDoc, orderBy, query, getDoc, setDoc
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Trash2, Plus, LogOut, Pencil, X, Check, Clock, Upload, Palette, Play, Image as ImageIcon, Layers } from 'lucide-react'
import styles from './Admin.module.css'

const EMPTY_FORM = {
  title: '', description: '', youtubeUrl: '',
  thumbnail: '', episode: '', category: '',
  season: '', seasonEpisode: '',
  durationMin: '', durationSec: '', publishAt: '',
}

const EMPTY_CAT = { name: '', thumbnail: '', cover: '', description: '' }

const DEFAULT_SETTINGS = {
  primaryColor: '#C084FC',
  accentColor: '#F5C842',
  navbarBg: '#000000',
  pageTitle: 'RosaTV',
  featuredCount: '6',
}

const DEFAULT_PLAYER = {
  style: 'classic',
  progressColor: '#cc0000',
  controlsBg: 'rgba(0,0,0,0.82)',
  controlsBgCustom: '',
  scrubberShape: 'square',
  autoHide: '3',
  // ── Configuración exclusiva del estilo Avanzado ──
  advAccentColor: '#f97316',      // color del punto/dot de la barra
  advProgressGradientStart: '#38bdf8',
  advProgressGradientEnd: '#f472b6',
  advButtonSize: 'medium',        // small | medium | large
  advOverlayOpacity: '0.55',      // opacidad del degradado oscuro arriba/abajo
}

// Input de color libre: picker + texto hex sin restricciones
function ColorField({ label, value, onChange }) {
  return (
    <div className={styles.settingGroup}>
      <label className={styles.settingLabel}>{label}</label>
      <div className={styles.colorFree}>
        <input
          type="color"
          className={styles.colorInput}
          value={value.startsWith('#') ? value : '#C084FC'}
          onChange={e => onChange(e.target.value)}
        />
        <input
          className={styles.colorFreeInput}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#C084FC o rgb()"
          spellCheck={false}
        />
        <div className={styles.colorSwatch} style={{ background: value }} />
      </div>
    </div>
  )
}

export default function Admin({ user, onLogout }) {
  const [tab,       setTab]       = useState('episodios')
  const [episodes,  setEpisodes]  = useState([])
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [formOpen,  setFormOpen]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [settings,  setSettings]  = useState(DEFAULT_SETTINGS)
  const [pageBanners, setPageBanners] = useState({})
  const [player,    setPlayer]    = useState(DEFAULT_PLAYER)
  const [saved,     setSaved]     = useState('')
  const [categories,   setCategories]   = useState([])
  const [catForm,      setCatForm]      = useState(EMPTY_CAT)
  const [catFormOpen,  setCatFormOpen]  = useState(false)
  const [catLoading,   setCatLoading]   = useState(false)
  const [editingCatId, setEditingCatId] = useState(null)

  const fetchEpisodes = async () => {
    const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { setCategories([]) }
  }

  const fetchConfig = async () => {
    try {
      const s = await getDoc(doc(db, 'config', 'settings'))
      if (s.exists()) setSettings(p => ({ ...p, ...s.data() }))
      const pl = await getDoc(doc(db, 'config', 'player'))
      if (pl.exists()) setPlayer(p => ({ ...p, ...pl.data() }))
      const sb = await getDoc(doc(db, 'config', 'pageBanners'))
      if (sb.exists()) setPageBanners(sb.data())
    } catch (e) {}
  }

  useEffect(() => { fetchEpisodes(); fetchConfig(); fetchCategories() }, [])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))

    // Auto-buscar miniatura cuando se pega una URL de archive.org
    if (name === 'youtubeUrl' && value.includes('archive.org/download/')) {
      autoFetchArchiveThumbnail(value)
    }
  }

  const [thumbLoading, setThumbLoading] = useState(false)

  const autoFetchArchiveThumbnail = async (url) => {
    try {
      // Extraer identificador del ítem y nombre base del archivo
      // Ej: https://archive.org/download/LRDG_T5-Pre/Capitulos/500.mp4
      const match = url.match(/archive\.org\/download\/([^/]+)\/.*\/([^/.]+)\.mp4/i)
        || url.match(/archive\.org\/download\/([^/]+)\/([^/.]+)\.mp4/i)
      if (!match) return
      const [, itemId, baseName] = match

      setThumbLoading(true)

      // Consultar la API de metadata de archive.org para listar archivos
      const res = await fetch(`https://archive.org/metadata/${itemId}`)
      if (!res.ok) return
      const data = await res.json()
      const files = data.files || []

      // Buscar el primer .jpg cuyo nombre empiece con el nombre base del video
      const thumb = files.find(f =>
        f.name.toLowerCase().startsWith(baseName.toLowerCase()) &&
        f.name.toLowerCase().endsWith('.jpg')
      )

      if (thumb) {
        const thumbUrl = `https://archive.org/download/${itemId}/${thumb.name}`
        setForm(f => ({ ...f, thumbnail: thumbUrl }))
      }
    } catch (e) {
      // Fallo silencioso — el usuario puede poner la miniatura manual
    } finally {
      setThumbLoading(false)
    }
  }

  const formatDuration = (min, sec) => {
    if (!min && !sec) return ''
    return `${min || '0'}:${(sec || '0').padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (!form.title || !form.youtubeUrl) return alert('El título y el link son obligatorios')
    setLoading(true)
    const data = {
      title: form.title, description: form.description,
      youtubeUrl: form.youtubeUrl, thumbnail: form.thumbnail,
      episode: form.episode, category: form.category || '',
      season: form.season || '',
      seasonEpisode: form.seasonEpisode || '',
      duration: formatDuration(form.durationMin, form.durationSec),
      publishAt: form.publishAt ? new Date(form.publishAt) : null,
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'episodes', editingId), data)
        setEditingId(null)
      } else {
        await addDoc(collection(db, 'episodes'), { ...data, createdAt: new Date() })
      }
      setForm(EMPTY_FORM)
      await fetchEpisodes()
    } catch (e) { alert('Error: ' + e.message) }
    setLoading(false)
  }

  // ── CRUD Categorías ──
  const handleCatSubmit = async () => {
    if (!catForm.name) return alert('El nombre de la categoría es obligatorio')
    setCatLoading(true)
    const data = {
      name: catForm.name,
      thumbnail: catForm.thumbnail || '',
      cover: catForm.cover || '',
      description: catForm.description || '',
    }
    try {
      if (editingCatId) {
        await updateDoc(doc(db, 'categories', editingCatId), data)
        setEditingCatId(null)
      } else {
        await addDoc(collection(db, 'categories'), { ...data, createdAt: new Date() })
      }
      setCatForm(EMPTY_CAT)
      setCatFormOpen(false)
      await fetchCategories()
      showSaved('¡Categoría guardada!')
    } catch (e) { alert('Error: ' + e.message) }
    setCatLoading(false)
  }

  const handleCatEdit = (cat) => {
    setCatForm({ name: cat.name||'', thumbnail: cat.thumbnail||'', cover: cat.cover||'', description: cat.description||'' })
    setEditingCatId(cat.id)
    setCatFormOpen(true)
  }

  const handleCatDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    await deleteDoc(doc(db, 'categories', id))
    await fetchCategories()
  }

  const handleEdit = (ep) => {
    const [min, sec] = (ep.duration || '').split(':')
    let publishAt = ''
    if (ep.publishAt) {
      const d = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
      publishAt = d.toISOString().slice(0, 16)
    }
    setForm({ title: ep.title||'', description: ep.description||'', youtubeUrl: ep.youtubeUrl||'',
      thumbnail: ep.thumbnail||'', episode: ep.episode||'', category: ep.category||'',
      season: ep.season||'', seasonEpisode: ep.seasonEpisode||'',
      durationMin: min||'', durationSec: sec||'', publishAt })
    setEditingId(ep.id)
    setFormOpen(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este episodio?')) return
    await deleteDoc(doc(db, 'episodes', id))
    await fetchEpisodes()
  }

  const handleLogout = async () => { await signOut(auth); onLogout() }

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'config', 'settings'), settings)
      // Aplicar colores inmediatamente
      const r = document.documentElement.style
      r.setProperty('--rose', settings.primaryColor)
      r.setProperty('--rose-light', settings.primaryColor + 'dd')
      r.setProperty('--rose-glow', settings.primaryColor + '33')
      r.setProperty('--gold', settings.accentColor)
      r.setProperty('--border', settings.primaryColor + '30')
      showSaved('¡Tema guardado y aplicado!')
    } catch (e) { alert('Error: ' + e.message) }
  }

  const savePageBanners = async () => {
    try {
      await setDoc(doc(db, 'config', 'pageBanners'), pageBanners)
      showSaved('¡Imágenes de página guardadas!')
    } catch (e) { alert('Error: ' + e.message) }
  }

  const savePlayer = async () => {
    try {
      const finalBg = player.controlsBgCustom || player.controlsBg
      await setDoc(doc(db, 'config', 'player'), { ...player, controlsBg: finalBg })
      showSaved('¡Reproductor guardado!')
    } catch (e) { alert('Error: ' + e.message) }
  }

  const showSaved = (msg) => { setSaved(msg); setTimeout(() => setSaved(''), 2500) }

  const isScheduled = ep => {
    if (!ep.publishAt) return false
    const pub = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
    return pub > new Date()
  }

  const getPublishDate = ep => {
    const src = ep.publishAt || ep.createdAt
    if (!src) return ''
    const d = src.toDate ? src.toDate() : new Date(src)
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const published = episodes.filter(ep => !isScheduled(ep))
  const scheduled = episodes.filter(ep => isScheduled(ep))
  const playerBg  = player.controlsBgCustom || player.controlsBg

  return (
    <div className={styles.wrapper}>

      <div className={styles.header}>
        <h1 className={styles.title}>Panel Admin</h1>
        <p className={styles.email}>{user.email}</p>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>

      {saved && <div className={styles.savedToast}>{saved}</div>}

      <div className={styles.content}>

        {/* ── SUBIR EPISODIOS ── */}
        {tab === 'episodios' && (
          <>
            {/* ── Botón Nuevo ── */}
            <div className={styles.episodesHeader}>
              <h2 className={styles.episodesHeaderTitle}>Episodios</h2>
              <button className={styles.newBtn} onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setFormOpen(true) }}>
                <Plus size={15}/> Nuevo
              </button>
            </div>

            {scheduled.length > 0 && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle} style={{ color: '#f5c842' }}><Clock size={15}/> Programados ({scheduled.length})</h2>
                <div className={styles.list}>
                  {scheduled.map(ep => (
                    <div key={ep.id} className={styles.epRow} onClick={() => handleEdit(ep)}>
                      {ep.thumbnail ? <img src={ep.thumbnail} alt="" className={styles.epThumb}/> : <div className={styles.epThumbFallback}>🌹</div>}
                      <div className={styles.epInfo}>
                        <div className={styles.epTitle}>{ep.title}</div>
                        <div className={styles.epMeta} style={{ color: '#f5c842' }}>⏳ {getPublishDate(ep)}</div>
                      </div>
                      <div className={styles.epActions}>
                        <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); handleEdit(ep) }}><Pencil size={13}/></button>
                        <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(ep.id) }}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Publicados ({published.length})</h2>
              {published.length === 0 ? <p className={styles.empty}>Sin episodios</p> : (
                <div className={styles.list}>
                  {published.map(ep => (
                    <div key={ep.id} className={`${styles.epRow} ${editingId === ep.id ? styles.epRowActive : ''}`} onClick={() => handleEdit(ep)}>
                      {ep.thumbnail ? <img src={ep.thumbnail} alt="" className={styles.epThumb}/> : <div className={styles.epThumbFallback}>🌹</div>}
                      <div className={styles.epInfo}>
                        <div className={styles.epTitle}>{ep.title}</div>
                        <div className={styles.epMeta}>{ep.episode && `EP ${ep.episode} · `}{getPublishDate(ep)}</div>
                      </div>
                      <div className={styles.epActions}>
                        <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); handleEdit(ep) }}><Pencil size={13}/></button>
                        <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(ep.id) }}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MODAL: Nuevo / Editar episodio ── */}
        {formOpen && (
          <div className={styles.modalOverlay} onClick={() => setFormOpen(false)}>
            <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.cardTitle}>
                  {editingId ? <><Pencil size={15}/> Editando episodio</> : <><Plus size={15}/> Nuevo episodio</>}
                </h2>
                <button className={styles.modalCloseBtn} onClick={() => setFormOpen(false)}><X size={18}/></button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.grid}>
                  <input className={styles.input} name="title"      placeholder="Nombre *"        value={form.title}      onChange={handleChange} />
                  <input className={styles.input} name="youtubeUrl" placeholder="Link del video (archive.org o YouTube) *" value={form.youtubeUrl} onChange={handleChange} />
                  <div style={{ position: 'relative' }}>
                    <input className={styles.input} name="thumbnail"  placeholder="Miniatura (URL) — se llena sola con archive.org"  value={form.thumbnail}  onChange={handleChange} />
                    {thumbLoading && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#5cb3ec' }}>Buscando miniatura…</span>}
                  </div>
                  {form.thumbnail && !thumbLoading && (
                    <img src={form.thumbnail} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 6, marginTop: -4 }} />
                  )}
                  <input className={styles.input} name="episode"    placeholder="Número global de episodio (ej. 456)" type="number" value={form.episode} onChange={handleChange} />
                </div>
                <div className={styles.grid}>
                  <input className={styles.input} name="season" placeholder="Temporada (1, 2, 3...)" type="number" min="1" value={form.season || ''} onChange={handleChange} />
                  <input className={styles.input} name="seasonEpisode" placeholder="Capítulo dentro de la temporada (ej. 5)" type="number" min="1" value={form.seasonEpisode || ''} onChange={handleChange} />
                </div>
                <select className={styles.input} name="category" value={form.category} onChange={handleChange}>
                  <option value="">Sin categoría (La Rosa de Guadalupe por defecto)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className={styles.durationRow}>
                  <span className={styles.durationLabel}>Duración:</span>
                  <input className={`${styles.input} ${styles.durationInput}`} name="durationMin" type="number" min="0" placeholder="Min" value={form.durationMin} onChange={handleChange} />
                  <span className={styles.durationSep}>:</span>
                  <input className={`${styles.input} ${styles.durationInput}`} name="durationSec" type="number" min="0" max="59" placeholder="Seg" value={form.durationSec} onChange={handleChange} />
                </div>
                <div className={styles.scheduleBox}>
                  <div className={styles.scheduleLabel}><Clock size={13}/> Programar publicación</div>
                  <p className={styles.scheduleHint}>Vacío = publicar ahora</p>
                  <input className={styles.input} type="datetime-local" name="publishAt" value={form.publishAt} onChange={handleChange} />
                  {form.publishAt && <button className={styles.clearDate} onClick={() => setForm(f => ({ ...f, publishAt: '' }))}><X size={11}/> Publicar inmediatamente</button>}
                </div>
                <textarea className={styles.textarea} name="description" placeholder="Descripción" value={form.description} onChange={handleChange} rows={3} />

                {editingId && (
                  <button
                    className={styles.deleteEpBtn}
                    onClick={() => { handleDelete(editingId); setFormOpen(false) }}
                  >
                    <Trash2 size={14}/> Eliminar episodio
                  </button>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setFormOpen(false)}><X size={14}/> Cancelar</button>
                <button className={styles.submitBtn} onClick={async () => { await handleSubmit(); setFormOpen(false) }} disabled={loading}>
                  {loading ? 'Guardando...' : editingId ? <><Check size={14}/> Guardar cambios</> : '✅ Publicar episodio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIG TEMA ── */}
        {tab === 'tema' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}><Palette size={15}/> Configuración del Tema</h2>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Nombre de la página</label>
              <input className={styles.input} placeholder="RosaTV" value={settings.pageTitle}
                onChange={e => setSettings(s => ({ ...s, pageTitle: e.target.value }))} />
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Episodios en Destacados (1-20)</label>
              <input className={styles.input} type="number" min="1" max="20" value={settings.featuredCount}
                onChange={e => setSettings(s => ({ ...s, featuredCount: e.target.value }))} />
            </div>

            <ColorField label="Color principal (rosa/morado)"
              value={settings.primaryColor}
              onChange={v => setSettings(s => ({ ...s, primaryColor: v }))} />

            <ColorField label="Color secundario (dorado)"
              value={settings.accentColor}
              onChange={v => setSettings(s => ({ ...s, accentColor: v }))} />

            <ColorField label="Color de fondo del navbar"
              value={settings.navbarBg}
              onChange={v => setSettings(s => ({ ...s, navbarBg: v }))} />

            {/* Preview en vivo */}
            <div className={styles.preview}>
              <div className={styles.previewNav} style={{ background: settings.navbarBg }}>
                <span style={{ color: settings.primaryColor }}>🌹 {settings.pageTitle}</span>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewBadge} style={{ background: settings.primaryColor }}>Destacados</div>
                <div className={styles.previewCard} style={{ borderColor: settings.primaryColor }} />
                <div className={styles.previewCard} style={{ borderColor: settings.accentColor }} />
              </div>
            </div>

            <button className={styles.submitBtn} onClick={saveSettings}>💾 Guardar y aplicar tema</button>
          </div>
        )}

        {/* ── IMÁGENES DE BANNER POR PÁGINA ── */}
        {tab === 'tema' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}><ImageIcon size={15}/> Imagen del banner por página</h2>
            <p className={styles.bannerHint}>
              Pega el link de una imagen para cada página. Si la dejas vacía, se usará automáticamente la miniatura del primer episodio de esa página.
            </p>

            {[1,2,3,4,5,6,7].map(p => (
              <div key={p} className={styles.bannerRow}>
                <div className={styles.bannerPreview}>
                  {pageBanners[p]
                    ? <img src={pageBanners[p]} alt={`Página ${p}`} className={styles.bannerPreviewImg} />
                    : <div className={styles.bannerPreviewEmpty}>P{p}</div>
                  }
                </div>
                <input
                  className={styles.input}
                  placeholder={`URL de imagen para Página ${p}`}
                  value={pageBanners[p] || ''}
                  onChange={e => setPageBanners(b => ({ ...b, [p]: e.target.value }))}
                />
                {pageBanners[p] && (
                  <button className={styles.bannerClearBtn} onClick={() => setPageBanners(b => { const n = { ...b }; delete n[p]; return n })}>
                    <X size={13}/>
                  </button>
                )}
              </div>
            ))}

            <button className={styles.submitBtn} onClick={savePageBanners}>💾 Guardar imágenes de página</button>
          </div>
        )}

        {/* ── DISEÑO REPRODUCTOR ── */}
        {tab === 'reproductor' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}><Play size={15}/> Diseño del Reproductor</h2>

            {/* Selector de estilo: Clásico vs Avanzado */}
            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Estilo del reproductor</label>
              <div className={styles.styleBubbles}>

                <button
                  className={`${styles.styleBubble} ${player.style === 'classic' ? styles.styleBubbleActive : ''}`}
                  onClick={() => setPlayer(p => ({ ...p, style: 'classic' }))}
                >
                  <div className={styles.bubblePreviewClassic}>
                    <div className={styles.bubblePlayDot} />
                    <div className={styles.bubbleBarRed} />
                  </div>
                  <span>Clásico</span>
                  <p>Barra roja estilo YouTube 2012</p>
                </button>

                <button
                  className={`${styles.styleBubble} ${player.style === 'advanced' ? styles.styleBubbleActive : ''}`}
                  onClick={() => setPlayer(p => ({ ...p, style: 'advanced' }))}
                >
                  <div className={styles.bubblePreviewAdvanced}>
                    <div className={styles.bubbleSkip}>10</div>
                    <div className={styles.bubblePlayCircle} />
                    <div className={styles.bubbleSkip}>10</div>
                  </div>
                  <span>Avanzado</span>
                  <p>Brillo, volumen y +10/-10 seg</p>
                </button>

              </div>
            </div>

            <ColorField label="Color de la barra de progreso"
              value={player.progressColor}
              onChange={v => setPlayer(p => ({ ...p, progressColor: v }))} />

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Fondo de los controles (presets)</label>
              <select className={styles.input} value={player.controlsBg}
                onChange={e => setPlayer(p => ({ ...p, controlsBg: e.target.value, controlsBgCustom: '' }))}>
                <option value="rgba(0,0,0,0.82)">Negro oscuro (82%)</option>
                <option value="rgba(0,0,0,0.5)">Negro medio (50%)</option>
                <option value="rgba(0,0,0,0.15)">Negro sutil (15%)</option>
                <option value="rgba(30,0,50,0.85)">Morado oscuro</option>
                <option value="rgba(0,0,80,0.85)">Azul oscuro</option>
              </select>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>O escribe un color personalizado (rgba, hex)</label>
              <input className={styles.input} placeholder="rgba(0,0,0,0.82) o #000"
                value={player.controlsBgCustom}
                onChange={e => setPlayer(p => ({ ...p, controlsBgCustom: e.target.value }))} />
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Forma del scrubber</label>
              <div className={styles.radioRow}>
                {[['square','Cuadrado'],['circle','Círculo']].map(([val, label]) => (
                  <label key={val} className={`${styles.radioOpt} ${player.scrubberShape === val ? styles.radioActive : ''}`}>
                    <input type="radio" name="scrubber" value={val} checked={player.scrubberShape === val}
                      onChange={e => setPlayer(p => ({ ...p, scrubberShape: e.target.value }))} />
                    <div className={styles.scrubberPreview} style={{ borderRadius: val === 'circle' ? '50%' : '2px' }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.settingLabel}>Ocultar controles después de</label>
              <select className={styles.input} value={player.autoHide}
                onChange={e => setPlayer(p => ({ ...p, autoHide: e.target.value }))}>
                <option value="2">2 segundos</option>
                <option value="3">3 segundos</option>
                <option value="5">5 segundos</option>
                <option value="8">8 segundos</option>
                <option value="0">Nunca ocultar</option>
              </select>
            </div>

            {/* ── Configuración exclusiva del estilo Avanzado ── */}
            {player.style === 'advanced' && (
              <>
                <div className={styles.advDivider}>
                  <span>Ajustes del diseño Avanzado</span>
                </div>

                <ColorField label="Color del punto en la barra (dot)"
                  value={player.advAccentColor}
                  onChange={v => setPlayer(p => ({ ...p, advAccentColor: v }))} />

                <div className={styles.colorRow}>
                  <ColorField label="Degradado barra — inicio"
                    value={player.advProgressGradientStart}
                    onChange={v => setPlayer(p => ({ ...p, advProgressGradientStart: v }))} />
                  <ColorField label="Degradado barra — final"
                    value={player.advProgressGradientEnd}
                    onChange={v => setPlayer(p => ({ ...p, advProgressGradientEnd: v }))} />
                </div>

                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>Tamaño de los botones</label>
                  <div className={styles.radioRow}>
                    {[['small','Pequeño'],['medium','Mediano'],['large','Grande']].map(([val, label]) => (
                      <label key={val} className={`${styles.radioOpt} ${player.advButtonSize === val ? styles.radioActive : ''}`}>
                        <input type="radio" name="advBtnSize" value={val} checked={player.advButtonSize === val}
                          onChange={e => setPlayer(p => ({ ...p, advButtonSize: e.target.value }))} />
                        <div className={styles.btnSizePreview} style={{
                          width: val === 'small' ? 16 : val === 'large' ? 28 : 22,
                          height: val === 'small' ? 16 : val === 'large' ? 28 : 22,
                        }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>
                    Oscurecer fondo del header/footer ({Math.round(player.advOverlayOpacity * 100)}%)
                  </label>
                  <input
                    type="range" min="0" max="0.9" step="0.05"
                    value={player.advOverlayOpacity}
                    onChange={e => setPlayer(p => ({ ...p, advOverlayOpacity: e.target.value }))}
                    className={styles.opacitySlider}
                  />
                </div>
              </>
            )}

            {/* Preview en vivo */}
            <div className={styles.playerPreview}>
              <div className={styles.playerPreviewScreen} />
              <div className={styles.playerPreviewBar} style={{ background: playerBg }}>
                <div className={styles.playerPreviewProgress}>
                  <div className={styles.playerPreviewPlayed} style={{ background: player.progressColor, width: '45%' }} />
                  <div className={styles.playerPreviewScrubber} style={{
                    left: '45%',
                    borderRadius: player.scrubberShape === 'circle' ? '50%' : '2px',
                  }} />
                </div>
                <div className={styles.playerPreviewControls}>
                  <span style={{ color: '#bbb', fontSize: 10 }}>▶ 🔊 ━━━━━━━ 20:00 / 42:00 ⛶</span>
                </div>
              </div>
            </div>

            <button className={styles.submitBtn} onClick={savePlayer}>💾 Guardar reproductor</button>
          </div>
        )}

        {/* ── CATEGORÍAS ── */}
        {tab === 'categorias' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}><Layers size={15}/> Categorías</h2>
            <p className={styles.settingHint}>Crea categorías para organizar tus series. Los episodios se pueden asignar a una categoría al subirlos o editarlos.</p>

            <button className={styles.submitBtn} style={{ marginBottom: 20 }}
              onClick={() => { setCatForm(EMPTY_CAT); setEditingCatId(null); setCatFormOpen(true) }}>
              <Plus size={14}/> Nueva categoría
            </button>

            {catFormOpen && (
              <div className={styles.card} style={{ background: 'rgba(255,255,255,0.04)', marginBottom: 20 }}>
                <h3 className={styles.cardTitle} style={{ fontSize: 14 }}>
                  {editingCatId ? 'Editar categoría' : 'Nueva categoría'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className={styles.input} placeholder="Nombre de la categoría *"
                    value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
                  <input className={styles.input} placeholder="Miniatura (URL de imagen pequeña)"
                    value={catForm.thumbnail} onChange={e => setCatForm(f => ({ ...f, thumbnail: e.target.value }))} />
                  <input className={styles.input} placeholder="Portada (URL de imagen grande/banner)"
                    value={catForm.cover} onChange={e => setCatForm(f => ({ ...f, cover: e.target.value }))} />
                  <textarea className={styles.textarea} placeholder="Descripción de la categoría" rows={3}
                    value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
                  {catForm.thumbnail && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img src={catForm.thumbnail} alt="" style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 8 }} />
                      <span style={{ fontSize: 11, color: '#888' }}>Vista previa miniatura</span>
                    </div>
                  )}
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.cancelBtn} onClick={() => { setCatFormOpen(false); setEditingCatId(null) }}>Cancelar</button>
                  <button className={styles.saveBtn} onClick={handleCatSubmit} disabled={catLoading}>
                    {catLoading ? 'Guardando...' : <><Check size={13}/> Guardar</>}
                  </button>
                </div>
              </div>
            )}

            {categories.length === 0 && !catFormOpen && (
              <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No hay categorías creadas todavía.
              </p>
            )}

            {categories.map(cat => (
              <div key={cat.id} className={styles.epRow}>
                {cat.thumbnail
                  ? <img src={cat.thumbnail} alt="" className={styles.epThumb} style={{ borderRadius: 8, objectFit: 'cover' }} />
                  : <div className={styles.epThumbFallback}><Layers size={16}/></div>
                }
                <div className={styles.epInfo}>
                  <div className={styles.epTitle}>{cat.name}</div>
                  {cat.description && <div className={styles.epMeta}>{cat.description.slice(0, 60)}{cat.description.length > 60 ? '…' : ''}</div>}
                </div>
                <div className={styles.epActions}>
                  <button className={styles.editBtn} onClick={() => handleCatEdit(cat)}><Pencil size={13}/></button>
                  <button className={styles.deleteBtn} onClick={() => handleCatDelete(cat.id)}><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── BARRA INFERIOR ── */}
      <nav className={styles.bottomNav}>
        <button className={`${styles.bottomBtn} ${tab === 'episodios' ? styles.bottomActive : ''}`} onClick={() => setTab('episodios')}>
          <Upload size={20} />
          <span>Subir Episodios</span>
        </button>
        <button className={`${styles.bottomBtn} ${tab === 'tema' ? styles.bottomActive : ''}`} onClick={() => setTab('tema')}>
          <Palette size={20} />
          <span>Config Tema</span>
        </button>
        <button className={`${styles.bottomBtn} ${tab === 'reproductor' ? styles.bottomActive : ''}`} onClick={() => setTab('reproductor')}>
          <Play size={20} />
          <span>Diseño Reproductor</span>
        </button>
        <button className={`${styles.bottomBtn} ${tab === 'categorias' ? styles.bottomActive : ''}`} onClick={() => setTab('categorias')}>
          <Layers size={20} />
          <span>Categorías</span>
        </button>
      </nav>

    </div>
  )
}
