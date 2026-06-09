import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Trash2, Plus, LogOut } from 'lucide-react'
import styles from './Admin.module.css'

export default function Admin({ user, onLogout }) {
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    youtubeUrl: '',
    season: '',
    episode: '',
  })

  const fetchEpisodes = async () => {
    const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchEpisodes() }, [])

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (!form.title || !form.youtubeUrl) return alert('El título y el link son obligatorios')
    setLoading(true)
    try {
      await addDoc(collection(db, 'episodes'), {
        ...form,
        createdAt: new Date(),
      })
      setForm({ title: '', description: '', date: '', youtubeUrl: '', season: '', episode: '' })
      await fetchEpisodes()
    } catch (e) {
      alert('Error al guardar: ' + e.message)
    }
    setLoading(false)
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

  return (
    <div className={styles.wrapper}>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Panel de Administrador</h1>
        <p className={styles.email}>{user.email}</p>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>

      {/* Formulario subir episodio */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}><Plus size={18} /> Subir Episodio</h2>

        <div className={styles.grid}>
          <input className={styles.input} name="title" placeholder="Nombre del episodio *" value={form.title} onChange={handleChange} />
          <input className={styles.input} name="youtubeUrl" placeholder="Link de YouTube *" value={form.youtubeUrl} onChange={handleChange} />
          <input className={styles.input} name="season" placeholder="Temporada (ej: 1)" value={form.season} onChange={handleChange} />
          <input className={styles.input} name="episode" placeholder="Episodio (ej: 5)" value={form.episode} onChange={handleChange} />
          <input className={styles.input} name="date" placeholder="Fecha de estreno (ej: 15 Junio 2026)" value={form.date} onChange={handleChange} />
        </div>

        <textarea
          className={styles.textarea}
          name="description"
          placeholder="Descripción del episodio"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />

        <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Guardando...' : '✅ Publicar episodio'}
        </button>
      </div>

      {/* Lista de episodios */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Episodios publicados ({episodes.length})</h2>

        {episodes.length === 0 ? (
          <p className={styles.empty}>No hay episodios aún</p>
        ) : (
          <div className={styles.list}>
            {episodes.map(ep => (
              <div key={ep.id} className={styles.epRow}>
                <div className={styles.epInfo}>
                  <div className={styles.epTitle}>{ep.title}</div>
                  <div className={styles.epMeta}>
                    {ep.season && `T${ep.season} · E${ep.episode} · `}{ep.date}
                  </div>
                </div>
                <button className={styles.deleteBtn} onClick={() => handleDelete(ep.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
