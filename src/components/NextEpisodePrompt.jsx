import { Play, X } from 'lucide-react'
import styles from './NextEpisodePrompt.module.css'

function getYoutubeId(url) {
  if (!url) return ''
  const m = url.match(/(?:v=|youtu\.be\/)([^&?\/]+)/)
  return m ? m[1] : ''
}

export default function NextEpisodePrompt({ nextEpisode, onPlayNext, onStay, countdown }) {
  if (!nextEpisode) return null

  const thumb = nextEpisode.thumbnail || (getYoutubeId(nextEpisode.youtubeUrl)
    ? `https://img.youtube.com/vi/${getYoutubeId(nextEpisode.youtubeUrl)}/hqdefault.jpg`
    : null)

  return (
    <div className={styles.overlay}>
      {/* Fondo difuminado con la miniatura del siguiente episodio */}
      {thumb && (
        <div className={styles.bgImage} style={{ backgroundImage: `url(${thumb})` }} />
      )}
      <div className={styles.bgDark} />

      <div className={styles.panel}>
        {(nextEpisode.season || nextEpisode.episode) && (
          <div className={styles.epLabel}>
            Temporada {nextEpisode.season} · Episodio {nextEpisode.episode}
          </div>
        )}

        <h3 className={styles.title}>{nextEpisode.title}</h3>

        {nextEpisode.description && (
          <p className={styles.desc}>{nextEpisode.description}</p>
        )}

        <div className={styles.btnRow}>
          <button className={styles.creditsBtn} onClick={onStay}>
            <X size={15} />
            Ver Créditos
          </button>
          <button className={styles.nextBtn} onClick={onPlayNext}>
            <Play size={15} style={{ marginLeft: -2 }} />
            Siguiente {countdown ? `(${countdown})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
