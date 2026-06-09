import { Play, Clock, Heart } from 'lucide-react'
import styles from './EpisodeCard.module.css'

export default function EpisodeCard({ episode, onToggleFav }) {
  const { title, season, episode: ep, duration, emoji, gradient, badge } = episode

  return (
    <div className={styles.card}>
      {badge && <div className={styles.badge}>{badge}</div>}

      <div className={styles.thumb}>
        <div className={styles.thumbBg} style={{ background: gradient }}>
          <span>{emoji}</span>
        </div>
        <div className={styles.overlay}>
          <button className={styles.playBtn} aria-label="Reproducir">
            <Play size={18} style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.epLabel}>
          Temporada {season} · Ep. {ep}
        </div>
        <div className={styles.title}>{title}</div>
        <div className={styles.meta}>
          <div className={styles.duration}>
            <Clock size={11} />
            {duration}
          </div>
          <button
            className={styles.heartBtn}
            onClick={onToggleFav}
            aria-label="Quitar de favoritos"
          >
            <Heart size={15} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  )
}
