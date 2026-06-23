import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import VideoPlayerAdvanced from '../components/VideoPlayerAdvanced'
import styles from './EpisodePlayer.module.css'

// Detecta si es un dispositivo móvil/tablet (no PC) para forzar pantalla completa + horizontal
function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)
}

export default function EpisodePlayer({ episode, onBack, playerConfig = {} }) {
  const isAdvanced = playerConfig.style === 'advanced'
  const containerRef = useRef(null)

  // Al entrar a un episodio en celular/tablet: pantalla completa + forzar horizontal
  useEffect(() => {
    if (!isMobileOrTablet()) return

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
          url={episode.youtubeUrl}
          title={episode.title}
          onBack={handleBack}
          playerConfig={playerConfig}
        />
      ) : (
        <VideoPlayer url={episode.youtubeUrl} title={episode.title} playerConfig={playerConfig} />
      )}

    </div>
  )
}
