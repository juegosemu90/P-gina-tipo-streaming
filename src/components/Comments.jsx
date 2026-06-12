import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, orderBy, query, where
} from 'firebase/firestore'
import { Trash2, Send, MessageCircle } from 'lucide-react'
import styles from './Comments.module.css'

export default function Comments({ episodeId, isAdmin }) {
  const [comments, setComments]   = useState([])
  const [name, setName]           = useState('')
  const [text, setText]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [sending, setSending]     = useState(false)

  const fetchComments = async () => {
    setLoading(true)
    const q = query(
      collection(db, 'comments'),
      where('episodeId', '==', episodeId),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => {
    if (episodeId) fetchComments()
  }, [episodeId])

  const handleSend = async () => {
    if (!name.trim() || !text.trim()) return
    setSending(true)
    try {
      await addDoc(collection(db, 'comments'), {
        episodeId,
        name:      name.trim(),
        text:      text.trim(),
        createdAt: new Date(),
      })
      setText('')
      await fetchComments()
    } catch (e) {
      alert('Error al enviar: ' + e.message)
    }
    setSending(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este comentario?')) return
    await deleteDoc(doc(db, 'comments', id))
    await fetchComments()
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className={styles.wrapper}>

      {/* Encabezado */}
      <div className={styles.header}>
        <MessageCircle size={18} />
        <h2 className={styles.title}>
          Comentarios {comments.length > 0 && <span className={styles.count}>{comments.length}</span>}
        </h2>
      </div>

      {/* Formulario */}
      <div className={styles.form}>
        <input
          className={styles.input}
          placeholder="Tu nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={40}
        />
        <div className={styles.textRow}>
          <textarea
            className={styles.textarea}
            placeholder="Escribe un comentario..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={sending || !name.trim() || !text.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Lista de comentarios */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : comments.length === 0 ? (
        <p className={styles.empty}>Sé el primero en comentar 💬</p>
      ) : (
        <div className={styles.list}>
          {comments.map(c => (
            <div key={c.id} className={styles.comment}>
              <div className={styles.avatar}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.body}>
                <div className={styles.meta}>
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.date}>{formatDate(c.createdAt)}</span>
                </div>
                <p className={styles.text}>{c.text}</p>
              </div>
              {isAdmin && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(c.id)}
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
