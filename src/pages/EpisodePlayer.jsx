import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import VideoPlayerAdvanced from '../components/VideoPlayerAdvanced'
import { isAppMode } from '../isAppMode'
import styles from './EpisodePlayer.module.css'

export default function EpisodePlayer({ episode, onBack, playerConfig = {}, nextEpisode, onPlayNext, allEpisodes = [], onSelectEpisode }) {
  const isAdvanced = playerConfig.style === 'advanced'
  const containerRef = useRef(null)

  // Solo cuando RosaTV corre como App instalada (no en navegador normal):
  // al abrir un episodio, entra automático en pantalla completa + horizontal.
  useEffect(() => {
    if (!isAppMode()) return

    const goFullscreenLandscape = async () => {
      try {
        const el = containerRef.current
        if (el && !document.fullscreenElement) {
          await el.requestFullscreen?.()
        }
      } catch (e) {}
      try {
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape')
        }
      } catch (e) {}
    }

    goFullscreenLandscape()

    return () => {
      try { screen.orientation?.unlock?.() } catch (e) {}
      try {
        if (document.fullscreenElement) document.exitFullscreen?.()
      } catch (e) {}
    }
  }, [])

  const handleBack = () => {
    try { screen.orientation?.unlock?.() } catch (e) {}
    try { if (document.fullscreenElement) document.exitFullscreen?.() } catch (e) {}
    onBack()
  }

  return (
    <div className={styles.wrapper} ref={containerRef}>

      {!isAdvanced && (
        <button className={styles.backBtn} onClick={handleBack}>
          <ArrowLeft size={18} />
          Volver
        </button>
      )}

      {isAdvanced ? (
        <VideoPlayerAdvanced
          key={episode.id}
          url={episode.youtubeUrl}
          title={episode.title}
          episodeNumber={episode.episode}
          onBack={handleBack}
          playerConfig={playerConfig}
          episodeId={episode.id}
          allEpisodes={allEpisodes}
          currentEpisodeId={episode.id}
          onSelectEpisode={onSelectEpisode}
        />
      ) : (
        <VideoPlayer
          key={episode.id}
          url={episode.youtubeUrl}
          title={episode.title}
          playerConfig={playerConfig}
          episodeId={episode.id}
        />
      )}

    </div>
  )
}
