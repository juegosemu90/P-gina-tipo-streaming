import { useRef, useState, useEffect, useCallback } from 'react'
import styles from './VideoPlayerAdvanced.module.css'

const IconClose = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>

const IconStretch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="4" y="6" width="16" height="12" rx="1.5"/>
    <path d="M12 3v3M12 18v3" strokeLinecap="round"/>
    <path d="M10 4.5l2-2 2 2M10 19.5l2 2 2-2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconVolume = ({ level }) => {
  if (level === 0) return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0017.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
}

const IconBack15 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round"/>
    <path d="M3 4v4h4" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="12" y="16" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Arial" fontWeight="bold">15</text>
  </svg>
)
const IconFwd15 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round"/>
    <path d="M21 4v4h-4" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="12" y="16" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Arial" fontWeight="bold">15</text>
  </svg>
)
const IconPlay  = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
const IconPause = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>

const IconFullscreen = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
const IconFullscreenExit = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>

const IconSubtitles = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="6" width="18" height="13" rx="2"/>
    <path d="M6.5 14h3M11.5 14h6M6.5 11h11" strokeLinecap="round"/>
  </svg>
)

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

function formatTime(s) {
  if (isNaN(s) || !s) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
}

function formatRemaining(cur, dur) {
  if (isNaN(dur) || !dur) return '-00:00'
  const rem = Math.max(0, dur - cur)
  const m = Math.floor(rem / 60)
  const sec = Math.floor(rem % 60)
  return `-${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
}

function getPctFromEvent(e, el) {
  const rect = el.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

export default function VideoPlayerAdvanced({ url, title, onBack, playerConfig = {} }) {
  const {
    advAccentColor    = '#ffffff',
    advOverlayOpacity = '0.5',
  } = playerConfig

  const videoRef     = useRef(null)
  const containerRef = useRef(null)
  const progressRef  = useRef(null)
  const hideTimer     = useRef(null)
  const isDragging    = useRef(false)

  const [playing,      setPlaying]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [progress,     setProgress]     = useState(0)
  const [volume,       setVolume]       = useState(1)
  const [muted,        setMuted]        = useState(false)
  const [stretched,    setStretched]    = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [coverActive,  setCoverActive]  = useState(true)

  const embed    = getEmbedUrl(url)
  const isNative = embed?.type === 'video'

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [playing])

  useEffect(() => { resetHideTimer(); return () => clearTimeout(hideTimer.current) }, [playing, resetHideTimer])

  useEffect(() => {
    if (!isNative) return
    const v = videoRef.current; if (!v) return
    const onTime = () => {
      if (isDragging.current) return
      setCurrentTime(v.currentTime)
      setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
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

  const togglePlay = () => { playing ? videoRef.current.pause() : videoRef.current.play() }
  const skip = (secs) => { if (videoRef.current) videoRef.current.currentTime += secs }
  const toggleStretch = () => setStretched(s => !s)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (videoRef.current) videoRef.current.muted = next
  }

  const changeVolume = (val) => {
    setVolume(val)
    setMuted(val === 0)
    if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0 }
  }

  const applySeek = useCallback((pct) => {
    const t = pct * duration
    setProgress(pct * 100); setCurrentTime(t)
    if (videoRef.current) videoRef.current.currentTime = t
  }, [duration])

  const onProgressStart = (e) => {
    if (!isNative) return
    e.stopPropagation(); e.preventDefault()
    isDragging.current = true
    applySeek(getPctFromEvent(e, progressRef.current))
    const onMove = (ev) => { if (isDragging.current) applySeek(getPctFromEvent(ev, progressRef.current)) }
    const onEnd = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onEnd)
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
  }

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

  const overlayGradient = `linear-gradient(to bottom, rgba(0,0,0,${advOverlayOpacity}) 0%, transparent 18%, transparent 75%, rgba(0,0,0,${advOverlayOpacity}) 100%)`

  return (
    <div
      ref={containerRef}
      className={`${styles.player} ${isFullscreen ? styles.fullscreen : ''}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className={`${styles.video} ${stretched ? styles.videoStretched : ''}`}
        src={url}
        playsInline
      />

      <div
        className={`${styles.uiLayer} ${showControls ? styles.visible : ''}`}
        style={{ background: overlayGradient }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Fila superior: X + estirar ............ volumen ── */}
        <div className={styles.topRow}>
          <div className={styles.topLeftGroup}>
            <button className={styles.topBtn} onClick={onBack} tabIndex={-1}>
              <IconClose />
            </button>
            <div className={styles.topDivider} />
            <button
              className={`${styles.topBtn} ${stretched ? styles.topBtnActive : ''}`}
              onClick={toggleStretch}
              tabIndex={-1}
            >
              <IconStretch />
            </button>
          </div>

          <div className={styles.volumeGroup}>
            <input
              type="range" min="0" max="1" step="0.01"
              value={muted ? 0 : volume}
              onChange={e => changeVolume(parseFloat(e.target.value))}
              className={styles.volumeSlider}
              style={{ '--vol-pct': `${(muted ? 0 : volume) * 100}%` }}
              tabIndex={-1}
            />
            <button className={styles.volumeIconBtn} onClick={toggleMute} tabIndex={-1}>
              <IconVolume level={muted ? 0 : volume} />
            </button>
          </div>
        </div>

        {/* ── Espacio central — toque para play/pause ── */}
        <div className={styles.body} />

        {/* ── Barra inferior ── */}
        <div className={styles.bottomBar}>
          <button className={styles.bottomIconBtn} onClick={() => skip(-15)} tabIndex={-1}>
            <IconBack15 />
          </button>
          <button className={styles.playBtn} onClick={togglePlay} tabIndex={-1}>
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button className={styles.bottomIconBtn} onClick={() => skip(15)} tabIndex={-1}>
            <IconFwd15 />
          </button>

          <span className={styles.timeLabel}>{formatTime(currentTime)}</span>

          <div className={styles.progressWrap} ref={progressRef} onMouseDown={onProgressStart} onTouchStart={onProgressStart}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%`, background: advAccentColor }} />
              <div className={styles.progressDot} style={{ left: `${progress}%`, background: advAccentColor }} />
            </div>
          </div>

          <span className={styles.timeLabel}>{formatRemaining(currentTime, duration)}</span>

          <button className={styles.bottomIconBtn} onClick={toggleFullscreen} tabIndex={-1}>
            {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
          </button>
          <button className={styles.bottomIconBtn} tabIndex={-1}>
            <IconSubtitles />
          </button>
        </div>
      </div>
    </div>
  )
}
