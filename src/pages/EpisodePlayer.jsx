import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import styles from './EpisodePlayer.module.css'

export default function EpisodePlayer({ episode, onBack }) {
  return (
    <div className={styles.wrapper}>

      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={18} />
        Volver
      </button>

      {/* Reproductor estilo YouTube clásico */}
      <VideoPlayer url={episode.youtubeUrl} title={episode.title} />

      {/* Info */}
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
              <Calendar size={13} /> {episode.date}
            </div>
          )}
          {episode.duration && (
            <div className={styles.metaChip} style={{
              '--chip-color':  'rgba(56,189,248,0.12)',
              '--chip-border': 'rgba(56,189,248,0.3)',
              '--chip-text':   '#7dd3fc'
            }}>
              <Clock size={13} /> {episode.duration}
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
