import { useRef, useState, useEffect, useCallback } from 'react'
import { saveProgress } from '../watchProgress'
import styles from './VideoPlayer.module.css'

const IconPlay = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
const IconPause = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
const IconVolume = ({ level }) => {
  if (level === 0) return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
  if (level < 0.5) return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
}
const IconFullscreen = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
const IconFullscreenExit = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>

function formatTime(s) {
  if (isNaN(s) || !s) return '0:00'
  return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`
}

function getEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&autoplay=1` }
  if (url.includes('archive.org/details/')) {
    const id = url.split('/details/')[1].split('/')[0]
    return { type: 'archive', src: `https://archive.org/embed/${id}` }
  }
  if (url.includes('archive.org/embed/')) return { type: 'archive', src: url }
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return { type: 'video', src: url }
  return { type: 'iframe', src: url }
}

function getPctFromEvent(e, el) {
  const rect = el.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)
}

export default function VideoPlayer({ url, title, playerConfig = {}, episodeId, startAt = 0 }) {
  const {
    progressColor  = '#cc0000',
    controlsBg     = 'rgba(0,0,0,0.82)',
    scrubberShape  = 'square',
    autoHide       = '3',
  } = playerConfig

  const videoRef     = useRef(null)
  const containerRef = useRef(null)
  const progressRef  = useRef(null)
  const hideTimer    = useRef(null)
  const isDragging   = useRef(false)
  const dragTouchId  = useRef(null)

  const [playing,      setPlaying]      = useState(false)
  const [loading,      setLoading]      = useState(true)
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
  const hideDelay = parseInt(autoHide) * 1000

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    if (playing && hideDelay > 0) {
      hideTimer.current = setTimeout(() => setShowControls(false), hideDelay)
    }
  }, [playing, hideDelay])

  useEffect(() => { resetHideTimer(); return () => clearTimeout(hideTimer.current) }, [playing, resetHideTimer])

  // Autoplay: empieza solo en cuanto el video está listo, sin tener que tocar Play
  useEffect(() => {
    if (!isNative) return
    const v = videoRef.current; if (!v) return
    const tryAutoplay = () => { v.play().catch(() => {}) }
    v.addEventListener('canplay', tryAutoplay, { once: true })
    return () => v.removeEventListener('canplay', tryAutoplay)
  }, [isNative, url])

  useEffect(() => {
    if (!isNative) return
    const v = videoRef.current; if (!v) return
    const onTime = () => {
      if (isDragging.current) return
      setCurrentTime(v.currentTime)
      setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
      if (v.buffered.length) setBuffered((v.buffered.end(v.buffered.length-1) / v.duration) * 100)
    }
    const onMeta = () => {
      setDuration(v.duration)
      if (startAt > 0 && startAt < v.duration - 2) {
        v.currentTime = startAt
        setCurrentTime(startAt)
      }
    }
    const onPlay    = () => { setPlaying(true); setLoading(false) }
    const onPause   = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onPlaying = () => setLoading(false)
    const onCanPlay = () => setLoading(false)

    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('playing', onPlaying)
    v.addEventListener('canplay', onCanPlay)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('canplay', onCanPlay)
    }
  }, [isNative, startAt])

  // Guarda el progreso del episodio cada 5 segundos mientras se reproduce
  useEffect(() => {
    if (!isNative || !episodeId) return
    const v = videoRef.current
    if (!v) return
    const persist = () => { if (v.duration) saveProgress(episodeId, v.currentTime, v.duration) }
    const interval = setInterval(persist, 5000)
    v.addEventListener('pause', persist)
    return () => {
      clearInterval(interval)
      v.removeEventListener('pause', persist)
      persist()
    }
  }, [isNative, episodeId])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const applySeek = useCallback((pct) => {
    const t = pct * duration
    setProgress(pct * 100); setCurrentTime(t)
    if (videoRef.current) videoRef.current.currentTime = t
  }, [duration])

  const onProgressStart = (e) => {
    if (!isNative) return
    e.stopPropagation(); e.preventDefault()
    isDragging.current = true
    if (e.touches) dragTouchId.current = e.touches[0].identifier
    applySeek(getPctFromEvent(e, progressRef.current))
    const onMove = (ev) => {
      if (!isDragging.current) return
      if (ev.touches) {
        const t = Array.from(ev.touches).find(t => t.identifier === dragTouchId.current)
        if (!t) return
      }
      applySeek(getPctFromEvent(ev, progressRef.current))
    }
    const onEnd = () => {
      isDragging.current = false; dragTouchId.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
  }

  // Pantalla completa MANUAL — al activarla, también gira a horizontal en celular/tablet
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try { await containerRef.current?.requestFullscreen?.() } catch (e) {}
      if (isMobileOrTablet()) {
        try { await screen.orientation?.lock?.('landscape') } catch (e) {}
      }
    } else {
      try { await document.exitFullscreen?.() } catch (e) {}
      try { screen.orientation?.unlock?.() } catch (e) {}
    }
  }

  const scrubberRadius = scrubberShape === 'circle' ? '50%' : '2px'

  if (!isNative) {
    return (
      <div className={styles.iframeWrapper}>
        {embed
          ? <>
              <iframe className={styles.iframe} src={embed.src} allowFullScreen allow="autoplay; fullscreen" frameBorder="0" title={title} />
              {coverActive && <div className={styles.iframeCover} onTouchStart={() => setCoverActive(false)} onClick={() => setCoverActive(false)} />}
            </>
          : <div className={styles.noVideo}>Sin video</div>
        }
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.player} ${isFullscreen ? styles.fullscreen : ''}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={() => { if (!isDragging.current) playing ? videoRef.current.pause() : videoRef.current.play() }}
    >
      <video ref={videoRef} className={styles.video} src={url} playsInline autoPlay />

      {/* Aro de carga — visible mientras el video está buffering/cargando */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {!playing && !loading && <div className={styles.centerPlay}><IconPlay /></div>}

      <div className={`${styles.controls} ${showControls ? styles.visible : ''}`}
        style={{ background: controlsBg }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.btnRow}>
          <button className={styles.ctrlBtn} onClick={() => playing ? videoRef.current.pause() : videoRef.current.play()} tabIndex={-1}>
            {playing ? <IconPause /> : <IconPlay />}
          </button>

          <div className={styles.volumeWrap} onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
            <button className={styles.ctrlBtn} onClick={() => { videoRef.current.muted = !videoRef.current.muted; setMuted(videoRef.current.muted) }} tabIndex={-1}>
              <IconVolume level={muted ? 0 : volume} />
            </button>
            <div className={`${styles.volumeSliderWrap} ${showVolume ? styles.volumeVisible : ''}`}>
              <input type="range" min="0" max="1" step="0.05"
                value={muted ? 0 : volume}
                onChange={e => { const v = parseFloat(e.target.value); videoRef.current.volume = v; setVolume(v); setMuted(v===0) }}
                className={styles.volumeSlider} tabIndex={-1} />
            </div>
          </div>

          <div className={styles.progressWrap} ref={progressRef} onMouseDown={onProgressStart} onTouchStart={onProgressStart}>
            <div className={styles.progressBar}>
              <div className={styles.bufferedBar} style={{ width: `${buffered}%` }} />
              <div className={styles.playedBar} style={{ width: `${progress}%`, background: progressColor }} />
              <div className={styles.scrubber} style={{ left: `${progress}%`, borderRadius: scrubberRadius, background: progressColor === '#cc0000' ? '#ddd' : '#fff' }} />
            </div>
          </div>

          <span className={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>

          <button className={styles.ctrlBtn} onClick={toggleFullscreen} tabIndex={-1}>
            {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
          </button>
        </div>
      </div>
    </div>
  )
}
