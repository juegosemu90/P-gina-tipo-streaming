import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, updateDoc, orderBy, query, getDoc, setDoc
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Trash2, Plus, LogOut, Pencil, X, Check, Clock, Upload, Palette, Play } from 'lucide-react'
import styles from './Admin.module.css'

const EMPTY_FORM = {
  title: '', description: '', youtubeUrl: '',
  thumbnail: '', season: '', episode: '',
  durationMin: '', durationSec: '', publishAt: '',
}

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
}
  progressColor: '#cc0000',
  controlsBg: 'rgba(0,0,0,0.82)',
  controlsBgCustom: '',
  scrubberShape: 'square',
  autoHide: '3',
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
  const [loading,   setLoading]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [settings,  setSettings]  = useState(DEFAULT_SETTINGS)
  const [player,    setPlayer]    = useState(DEFAULT_PLAYER)
  const [saved,     setSaved]     = useState('')

  const fetchEpisodes = async () => {
    const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const fetchConfig = async () => {
    try {
      const s = await getDoc(doc(db, 'config', 'settings'))
      if (s.exists()) setSettings(p => ({ ...p, ...s.data() }))
      const pl = await getDoc(doc(db, 'config', 'player'))
      if (pl.exists()) setPlayer(p => ({ ...p, ...pl.data() }))
    } catch (e) {}
  }

  useEffect(() => { fetchEpisodes(); fetchConfig() }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

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
      season: form.season, episode: form.episode,
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

  const handleEdit = (ep) => {
    const [min, sec] = (ep.duration || '').split(':')
    let publishAt = ''
    if (ep.publishAt) {
      const d = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
      publishAt = d.toISOString().slice(0, 16)
    }
    setForm({ title: ep.title||'', description: ep.description||'', youtubeUrl: ep.youtubeUrl||'',
      thumbnail: ep.thumbnail||'', season: ep.season||'', episode: ep.episode||'',
      durationMin: min||'', durationSec: sec||'', publishAt })
    setEditingId(ep.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                {editingId ? <><Pencil size={15}/> Editando</> : <><Plus size={15}/> Subir episodio</>}
              </h2>
              <div className={styles.grid}>
                <input className={styles.input} name="title"      placeholder="Nombre *"        value={form.title}      onChange={handleChange} />
                <input className={styles.input} name="youtubeUrl" placeholder="Link del video *" value={form.youtubeUrl} onChange={handleChange} />
                <input className={styles.input} name="thumbnail"  placeholder="Miniatura (URL)"  value={form.thumbnail}  onChange={handleChange} />
                <input className={styles.input} name="season"     placeholder="Temporada"        value={form.season}     onChange={handleChange} />
                <input className={styles.input} name="episode"    placeholder="Episodio"         value={form.episode}    onChange={handleChange} />
              </div>
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
              <div className={styles.btnRow}>
                {editingId && <button className={styles.cancelBtn} onClick={() => { setEditingId(null); setForm(EMPTY_FORM) }}><X size={14}/> Cancelar</button>}
                <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Guardando...' : editingId ? <><Check size={14}/> Guardar</> : '✅ Publicar'}
                </button>
              </div>
            </div>

            {scheduled.length > 0 && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle} style={{ color: '#f5c842' }}><Clock size={15}/> Programados ({scheduled.length})</h2>
                <div className={styles.list}>
                  {scheduled.map(ep => (
                    <div key={ep.id} className={styles.epRow}>
                      {ep.thumbnail ? <img src={ep.thumbnail} alt="" className={styles.epThumb}/> : <div className={styles.epThumbFallback}>🌹</div>}
                      <div className={styles.epInfo}>
                        <div className={styles.epTitle}>{ep.title}</div>
                        <div className={styles.epMeta} style={{ color: '#f5c842' }}>⏳ {getPublishDate(ep)}</div>
                      </div>
                      <div className={styles.epActions}>
                        <button className={styles.editBtn} onClick={() => handleEdit(ep)}><Pencil size={13}/></button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(ep.id)}><Trash2 size={13}/></button>
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
                    <div key={ep.id} className={`${styles.epRow} ${editingId === ep.id ? styles.epRowActive : ''}`}>
                      {ep.thumbnail ? <img src={ep.thumbnail} alt="" className={styles.epThumb}/> : <div className={styles.epThumbFallback}>🌹</div>}
                      <div className={styles.epInfo}>
                        <div className={styles.epTitle}>{ep.title}</div>
                        <div className={styles.epMeta}>{ep.season && `T${ep.season}·E${ep.episode} · `}{getPublishDate(ep)}</div>
                      </div>
                      <div className={styles.epActions}>
                        <button className={styles.editBtn} onClick={() => handleEdit(ep)}><Pencil size={13}/></button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(ep.id)}><Trash2 size={13}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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
      </nav>

    </div>
  )
}
