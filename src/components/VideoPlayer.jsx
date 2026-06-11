import { useRef, useState, useEffect, useCallback } from 'react'
import styles from './VideoPlayer.module.css'

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
)
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
)
const IconVolume = ({ level }) => {
  if (level === 0) return (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
  )
  if (level < 0.5) return (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
  )
}
const IconFullscreen = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
)
const IconFullscreenExit = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
)

function formatTime(s) {
  if (isNaN(s) || !s) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function getEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1` }
  if (url.includes('archive.org/details/')) {
    const id = url.split('/details/')[1].split('/')[0]
    return { type: 'archive', src: `https://archive.org/embed/${id}` }
  }
  if (url.includes('archive.org/embed/')) return { type: 'archive', src: url }
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return { type: 'video', src: url }
  return { type: 'iframe', src: url }
}

export default function VideoPlayer({ url, title }) {
  const videoRef     = useRef(null)
  const containerRef = useRef(null)
  const progressRef  = useRef(null)
  const hideTimer    = useRef(null)

  const [playing,      setPlaying]      = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [buffered,     setBuffered]     = useState(0)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showVolume,   setShowVolume]   = useState(false)
  const [coverActive,  setCoverActive]  = useState(true)

  const embed    = getEmbedUrl(url)
  const isNative = embed?.type === 'video'

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [playing])

  useEffect(() => {
    resetHideTimer()
    return () => clearTimeout(hideTimer.current)
  }, [playing, resetHideTimer])

  useEffect(() => {
    if (!isNative) return
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      setCurrentTime(v.currentTime)
      setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
      if (v.buffered.length)
        setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100)
    }
    const onMeta  = () => setDuration(v.duration)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [isNative])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const togglePlay = () => {
    if (!isNative) return
    playing ? videoRef.current.pause() : videoRef.current.play()
  }

  const seekTo = (e) => {
    if (!isNative) return
    const rect = progressRef.current.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    videoRef.current.currentTime = pct * duration
  }

  const toggleMute = () => {
    if (!isNative) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
  }

  const changeVolume = (e) => {
    if (!isNative) return
    const val = parseFloat(e.target.value)
    videoRef.current.volume = val
    setVolume(val)
    setMuted(val === 0)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  /* ── iframe ── */
  if (!isNative) {
    return (
      <div className={styles.iframeWrapper}>
        {embed ? (
          <>
            <iframe
              className={styles.iframe}
              src={embed.src}
              allowFullScreen
              allow="autoplay; fullscreen"
              frameBorder="0"
              title={title}
            />
            {coverActive && (
              <div
                className={styles.iframeCover}
                onTouchStart={() => setCoverActive(false)}
                onClick={() => setCoverActive(false)}
              />
            )}
          </>
        ) : (
          <div className={styles.noVideo}>Sin video disponible</div>
        )}
      </div>
    )
  }

  /* ── Reproductor nativo ── */
  return (
    <div
      ref={containerRef}
      className={`${styles.player} ${isFullscreen ? styles.fullscreen : ''}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlay}
    >
      <video ref={videoRef} className={styles.video} src={url} playsInline />

      {!playing && (
        <div className={styles.centerPlay}><IconPlay /></div>
      )}

      {/* Barra de controles — todo en una sola fila como la imagen */}
      <div
        className={`${styles.controls} ${showControls ? styles.visible : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.btnRow}>

          {/* Play/Pause */}
          <button className={styles.ctrlBtn} onClick={togglePlay} tabIndex={-1}>
            {playing ? <IconPause /> : <IconPlay />}
          </button>

          {/* Volumen */}
          <div
            className={styles.volumeWrap}
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            <button className={styles.ctrlBtn} onClick={toggleMute} tabIndex={-1}>
              <IconVolume level={muted ? 0 : volume} />
            </button>
            <div className={`${styles.volumeSliderWrap} ${showVolume ? styles.volumeVisible : ''}`}>
              <input
                type="range" min="0" max="1" step="0.05"
                value={muted ? 0 : volume}
                onChange={changeVolume}
                className={styles.volumeSlider}
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Barra de progreso — ocupa todo el centro */}
          <div className={styles.progressWrap} ref={progressRef} onClick={seekTo}>
            <div className={styles.progressBar}>
              <div className={styles.bufferedBar} style={{ width: `${buffered}%` }} />
              <div className={styles.playedBar}   style={{ width: `${progress}%` }} />
              <div className={styles.scrubber}    style={{ left:  `${progress}%` }} />
            </div>
          </div>

          {/* Tiempo */}
          <span className={styles.time}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Pantalla completa */}
          <button className={styles.ctrlBtn} onClick={toggleFullscreen} tabIndex={-1}>
            {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
          </button>

        </div>
      </div>
    </div>
  )
}
