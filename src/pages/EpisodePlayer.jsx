import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import styles from './EpisodePlayer.module.css'

function getVideoEmbed(url) {
  if (!url) return null

  // YouTube
  const ytMatch = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
  if (ytMatch) {
    return {
      type: 'youtube',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
    }
  }

  // Internet Archive — /details/ → /embed/
  if (url.includes('archive.org/details/')) {
    const id = url.split('/details/')[1].split('/')[0]
    return {
      type: 'archive',
      src: `https://archive.org/embed/${id}`,
    }
  }

  // Internet Archive embed directo
  if (url.includes('archive.org/embed/')) {
    return { type: 'archive', src: url }
  }

  // MP4 directo
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return { type: 'video', src: url }
  }

  // Fallback iframe
  return { type: 'iframe', src: url }
}

export default function EpisodePlayer({ episode, onBack }) {
  const embed = getVideoEmbed(episode.youtubeUrl)

  return (
    <div className={styles.wrapper}>

      {/* Botón volver */}
      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={18} />
        Volver
      </button>

      {/* Reproductor */}
      <div className={styles.playerWrapper}>
        {embed?.type === 'video' ? (
          <video
            className={styles.player}
            src={embed.src}
            controls
            autoPlay
          />
        ) : embed ? (
          <iframe
            className={styles.player}
            src={embed.src}
            allowFullScreen
            allow="autoplay; fullscreen"
            frameBorder="0"
            title={episode.title}
          />
        ) : (
          <div className={styles.noVideo}>Sin video disponible</div>
        )}
      </div>

      {/* Info del episodio */}
      <div className={styles.info}>

        {(episode.season || episode.episode) && (
          <div className={styles.epLabel}>
            Temporada {episode.season} · Episodio {episode.episode}
          </div>
        )}

        <h1 className={styles.title}>{episode.title}</h1>

        <div className={styles.metaRow}>
          {episode.date && (
            <div className={styles.metaChip}>
              <Calendar size={13} />
              {episode.date}
            </div>
          )}
          {episode.duration && (
            <div className={styles.metaChip} style={{ '--chip-color': 'rgba(56,189,248,0.15)', '--chip-border': 'rgba(56,189,248,0.35)', '--chip-text': '#7dd3fc' }}>
              <Clock size={13} />
              {episode.duration}
            </div>
          )}
        </div>

        {episode.description && (
          <div className={styles.descCard}>
            <p className={styles.desc}>{episode.description}</p>
          </div>
        )}

      </div>
    </div>
  )
}
