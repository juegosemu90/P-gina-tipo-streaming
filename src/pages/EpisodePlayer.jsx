import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Play, RotateCcw } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import VideoPlayerAdvanced from '../components/VideoPlayerAdvanced'
import { getProgress, clearProgress } from '../watchProgress'
import styles from './EpisodePlayer.module.css'

// Detecta si es un dispositivo móvil/tablet (no PC) para forzar pantalla completa + horizontal
function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)
}

function formatTime(s) {
  if (isNaN(s) || !s) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function EpisodePlayer({ episode, onBack, playerConfig = {} }) {
  const isAdvanced = playerConfig.style === 'advanced'
  const containerRef = useRef(null)

  const [savedProgress, setSavedProgress] = useState(null)
  // null = aún no decide; mientras tanto se muestra el modal si hay progreso guardado
  const [startAt, setStartAt] = useState(null)
  // true mientras el celular está girando a horizontal — evita que los controles
  // se oculten de golpe justo cuando cambia el tamaño de la pantalla
  const [orientationSettling, setOrientationSettling] = useState(true)

  // CORRECCIÓN DEL BUG: este efecto se reinicia cada vez que cambia el episodio
  // (por ejemplo al pasar al "siguiente episodio" sin salir del reproductor).
  // Antes el progreso/punto de inicio de un episodio viejo se quedaba "pegado"
  // y el video nuevo no arrancaba o se veía congelado.
  useEffect(() => {
    const prog = getProgress(episode.id)
    setSavedProgress(prog)
    setStartAt(prog ? null : 0)
  }, [episode.id])

  // Al entrar a un episodio en celular/tablet: pantalla completa + forzar horizontal
  useEffect(() => {
    if (!isMobileOrTablet()) {
      setOrientationSettling(false)
      return
    }

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
      // Le da tiempo al navegador a terminar de redimensionar el video
      // tras el giro de pantalla, antes de permitir que los controles se oculten.
      setTimeout(() => setOrientationSettling(false), 700)
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

  const handleContinue = () => {
    setStartAt(savedProgress.time)
  }

  const handleRestart = () => {
    clearProgress(episode.id)
    setStartAt(0)
  }

  return (
    <div className={styles.wrapper} ref={containerRef}>

      {/* ── Modal: ¿Continuar o empezar desde el inicio? ── */}
      {savedProgress && startAt === null && (
        <div className={styles.resumeOverlay}>
          {episode.thumbnail && (
            <div className={styles.resumeBg} style={{ backgroundImage: `url(${episode.thumbnail})` }} />
          )}
          <div className={styles.resumeShade} />

          <div className={styles.resumeCard}>
            <h3 className={styles.resumeTitle}>{episode.title}</h3>
            <p className={styles.resumeText}>
              Te quedaste en el minuto <strong>{formatTime(savedProgress.time)}</strong>
            </p>

            <button className={styles.resumeBtnPrimary} onClick={handleContinue}>
              <Play size={15} fill="#fff" style={{ marginLeft: -1 }} />
              Continuar viendo
            </button>

            <button className={styles.resumeBtnSecondary} onClick={handleRestart}>
              <RotateCcw size={14} />
              Empezar desde el inicio
            </button>
          </div>
        </div>
      )}

      {/* ── Reproductor — solo se monta cuando ya se decidió el punto de inicio ── */}
      {startAt !== null && (
        <>
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
              onBack={handleBack}
              playerConfig={playerConfig}
              episodeId={episode.id}
              startAt={startAt}
              forceShowControls={orientationSettling}
            />
          ) : (
            <VideoPlayer
              key={episode.id}
              url={episode.youtubeUrl}
              title={episode.title}
              playerConfig={playerConfig}
              episodeId={episode.id}
              startAt={startAt}
              forceShowControls={orientationSettling}
            />
          )}
        </>
      )}

    </div>
  )
}
