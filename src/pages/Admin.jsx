import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, orderBy, query } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Trash2, Plus, LogOut, Pencil, X, Check, Clock } from 'lucide-react'
import styles from './Admin.module.css'

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  youtubeUrl: '',
  thumbnail: '',
  season: '',
  episode: '',
  durationMin: '',
  durationSec: '',
  publishAt: '',
}

export default function Admin({ user, onLogout }) {
  const [episodes, setEpisodes] = useState([])
  const [form, setForm]         = useState(EMPTY_FORM)
  const [loading, setLoading]   = useState(false)
  const [editingId, setEditingId] = useState(null)

  const fetchEpisodes = async () => {
    const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchEpisodes() }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const formatDuration = (min, sec) => {
    if (!min && !sec) return ''
    const m = min || '0'
    const s = (sec || '0').padStart(2, '0')
    return `${m}:${s}`
  }

  const handleSubmit = async () => {
    if (!form.title || !form.youtubeUrl) return alert('El título y el link son obligatorios')
    setLoading(true)

    const data = {
      title:       form.title,
      description: form.description,
      date:        form.date,
      youtubeUrl:  form.youtubeUrl,
      thumbnail:   form.thumbnail,
      season:      form.season,
      episode:     form.episode,
      duration:    formatDuration(form.durationMin, form.durationSec),
      // Si tiene fecha de publicación la guardamos, si no se publica inmediatamente
      publishAt:   form.publishAt ? new Date(form.publishAt) : null,
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
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setLoading(false)
  }

  const handleEdit = (ep) => {
    const [min, sec] = (ep.duration || '').split(':')
    // Convertir publishAt de Timestamp a string para el input datetime-local
    let publishAt = ''
    if (ep.publishAt) {
      const d = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
      // formato requerido por datetime-local: YYYY-MM-DDTHH:mm
      publishAt = d.toISOString().slice(0, 16)
    }
    setForm({
      title:       ep.title || '',
      description: ep.description || '',
      date:        ep.date || '',
      youtubeUrl:  ep.youtubeUrl || '',
      thumbnail:   ep.thumbnail || '',
      season:      ep.season || '',
      episode:     ep.episode || '',
      durationMin: min || '',
      durationSec: sec || '',
      publishAt,
    })
    setEditingId(ep.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este episodio?')) return
    await deleteDoc(doc(db, 'episodes', id))
    await fetchEpisodes()
  }

  const handleLogout = async () => {
    await signOut(auth)
    onLogout()
  }

  // Determina el estado de publicación de un episodio
  const getPublishStatus = (ep) => {
    if (!ep.publishAt) return { label: 'Publicado', color: '#4ade80' }
    const pub = ep.publishAt.toDate ? ep.publishAt.toDate() : new Date(ep.publishAt)
    if (pub > new Date()) {
      return {
        label: `Programado: ${pub.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        color: '#f5c842'
      }
    }
    return { label: 'Publicado', color: '#4ade80' }
  }

  return (
    <div className={styles.wrapper}>

      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Administrador</h1>
        <p className={styles.email}>{user.email}</p>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      {/* Formulario */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          {editingId ? <><Pencil size={16} /> Editando episodio</> : <><Plus size={16} /> Subir episodio</>}
        </h2>

        <div className={styles.grid}>
          <input className={styles.input} name="title"      placeholder="Nombre del episodio *" value={form.title}      onChange={handleChange} />
          <input className={styles.input} name="youtubeUrl" placeholder="Link del video *"       value={form.youtubeUrl} onChange={handleChange} />
          <input className={styles.input} name="thumbnail"  placeholder="Link de miniatura"      value={form.thumbnail}  onChange={handleChange} />
          <input className={styles.input} name="date"       placeholder="Fecha de estreno"        value={form.date}       onChange={handleChange} />
          <input className={styles.input} name="season"     placeholder="Temporada (ej: 1)"       value={form.season}     onChange={handleChange} />
          <input className={styles.input} name="episode"    placeholder="Episodio (ej: 5)"        value={form.episode}    onChange={handleChange} />
        </div>

        {/* Duración */}
        <div className={styles.durationRow}>
          <span className={styles.durationLabel}>Duración:</span>
          <input className={`${styles.input} ${styles.durationInput}`} name="durationMin" type="number" min="0" placeholder="Min" value={form.durationMin} onChange={handleChange} />
          <span className={styles.durationSep}>:</span>
          <input className={`${styles.input} ${styles.durationInput}`} name="durationSec" type="number" min="0" max="59" placeholder="Seg" value={form.durationSec} onChange={handleChange} />
        </div>

        {/* Programar publicación */}
        <div className={styles.scheduleBox}>
          <div className={styles.scheduleLabel}>
            <Clock size={14} />
            Programar publicación
          </div>
          <p className={styles.scheduleHint}>
            Si seleccionas una fecha futura, el episodio no será visible hasta ese día y hora. Déjalo vacío para publicar ahora.
          </p>
          <input
            className={styles.input}
            type="datetime-local"
            name="publishAt"
            value={form.publishAt}
            onChange={handleChange}
          />
          {form.publishAt && (
            <button className={styles.clearDate} onClick={() => setForm(f => ({ ...f, publishAt: '' }))}>
              <X size={12} /> Publicar inmediatamente
            </button>
          )}
        </div>

        <textarea
          className={styles.textarea}
          name="description"
          placeholder="Descripción del episodio"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />

        <div className={styles.btnRow}>
          {editingId && (
            <button className={styles.cancelBtn} onClick={handleCancelEdit}>
              <X size={15} /> Cancelar
            </button>
          )}
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : editingId ? <><Check size={15} /> Guardar cambios</> : '✅ Publicar episodio'}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Episodios ({episodes.length})</h2>

        {episodes.length === 0 ? (
          <p className={styles.empty}>No hay episodios aún</p>
        ) : (
          <div className={styles.list}>
            {episodes.map(ep => {
              const status = getPublishStatus(ep)
              return (
                <div key={ep.id} className={`${styles.epRow} ${editingId === ep.id ? styles.epRowActive : ''}`}>
                  {ep.thumbnail
                    ? <img src={ep.thumbnail} alt={ep.title} className={styles.epThumb} />
                    : <div className={styles.epThumbFallback}>🌹</div>
                  }
                  <div className={styles.epInfo}>
                    <div className={styles.epTitle}>{ep.title}</div>
                    <div className={styles.epMeta}>
                      {ep.season && `T${ep.season}·E${ep.episode} · `}{ep.date}{ep.duration && ` · ${ep.duration}`}
                    </div>
                    {/* Estado de publicación */}
                    <div className={styles.epStatus} style={{ color: status.color }}>
                      ● {status.label}
                    </div>
                  </div>
                  <div className={styles.epActions}>
                    <button className={styles.editBtn} onClick={() => handleEdit(ep)}><Pencil size={14} /></button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(ep.id)}><Trash2 size={14} /></button>
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
