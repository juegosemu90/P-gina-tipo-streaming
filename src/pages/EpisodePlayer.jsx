import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import NextEpisodePrompt from '../components/NextEpisodePrompt'
import styles from './EpisodePlayer.module.css'

export default function EpisodePlayer({ episode, onBack, playerConfig, nextEpisode, onPlayNext }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed,  setDismissed]  = useState(false)
  const [countdown,  setCountdown]  = useState(8)

  // Se llama desde VideoPlayer cuando el video está cerca de terminar
  const handleNearEnd = useCallback(() => {
    if (!dismissed && nextEpisode) setShowPrompt(true)
  }, [dismissed, nextEpisode])

  // Cuenta regresiva para autoplay del siguiente episodio
  useEffect(() => {
    if (!showPrompt) return
    setCountdown(8)
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
          onPlayNext?.(nextEpisode)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showPrompt])

  const handleStay = () => {
    setShowPrompt(false)
    setDismissed(true)
  }

  const handlePlayNext = () => {
    setShowPrompt(false)
    onPlayNext?.(nextEpisode)
  }

  return (
    <div className={styles.wrapper}>

      <button className={styles.backBtn} onClick={onBack}>
        <ArrowLeft size={18} />
        Volver
      </button>

      <div className={styles.playerContainer}>
        <VideoPlayer
          url={episode.youtubeUrl}
          title={episode.title}
          playerConfig={playerConfig}
          onNearEnd={handleNearEnd}
        />

        {showPrompt && nextEpisode && (
          <NextEpisodePrompt
            nextEpisode={nextEpisode}
            onPlayNext={handlePlayNext}
            onStay={handleStay}
            countdown={countdown}
          />
        )}
      </div>

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
