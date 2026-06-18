import { useRef, useState, useEffect, useCallback } from 'react'
import styles from './VideoPlayerAdvanced.module.css'

const IconPlay  = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
const IconPause = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
const IconBack10 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round"/>
    <path d="M3 4v4h4" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="12" y="16" fontSize="7.5" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Arial">10</text>
  </svg>
)
const IconFwd10 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round"/>
    <path d="M21 4v4h-4" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="12" y="16" fontSize="7.5" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Arial">10</text>
  </svg>
)
const IconBack    = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/></svg>
const IconShare   = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
const IconHelp    = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>
const IconSun     = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.02 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41a.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41a.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>
const IconVolume  = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>

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

function getPctFromEvent(e, el) {
  const rect = el.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
}

export default function VideoPlayerAdvanced({ url, title, seasonLabel, episodeLabel, onBack }) {
  const videoRef     = useRef(null)
  const containerRef = useRef(null)
  const progressRef  = useRef(null)
  const hideTimer     = useRef(null)
  const isDragging    = useRef(false)

  const [playing,      setPlaying]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [progress,     setProgress]     = useState(0)
  const [brightness,   setBrightness]   = useState(1)
  const [volume,       setVolume]       = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [coverActive,  setCoverActive]  = useState(true)

  const embed    = getEmbedUrl(url)
  const isNative = embed?.type === 'video'

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3500)
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

  const togglePlay = () => { playing ? videoRef.current.pause() : videoRef.current.play() }
  const skip = (secs) => { if (videoRef.current) videoRef.current.currentTime += secs }

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

  const changeBrightness = (val) => {
    setBrightness(val)
    if (videoRef.current) videoRef.current.style.filter = `brightness(${0.4 + val * 0.6})`
  }

  const changeVolume = (val) => {
    setVolume(val)
    if (videoRef.current) videoRef.current.volume = val
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

  return (
    <div
      ref={containerRef}
      className={styles.player}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlay}
    >
      <video ref={videoRef} className={styles.video} src={url} playsInline />

      <div className={`${styles.uiLayer} ${showControls ? styles.visible : ''}`} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <button className={styles.iconBtn} onClick={onBack} tabIndex={-1}><IconBack /></button>
          <div className={styles.headerTitle}>
            {title}{seasonLabel ? ` T${seasonLabel}` : ''}{episodeLabel ? ` ${episodeLabel}` : ''}
          </div>
          <div className={styles.headerRight}>
            <button className={styles.iconBtn} tabIndex={-1}><IconShare /></button>
            <button className={styles.iconBtn} tabIndex={-1}><IconHelp /></button>
          </div>
        </div>

        {/* ── Cuerpo: sliders + controles centrales ── */}
        <div className={styles.body}>

          {/* Slider brillo */}
          <div className={styles.sideSlider}>
            <div className={styles.sliderIconTop}><IconSun /></div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={brightness}
              onChange={e => changeBrightness(parseFloat(e.target.value))}
              className={styles.verticalSlider}
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              tabIndex={-1}
            />
          </div>

          {/* Controles centrales */}
          <div className={styles.centerControls}>
            <button className={styles.skipBtn} onClick={() => skip(-10)} tabIndex={-1}><IconBack10 /></button>
            <button className={styles.playBtn} onClick={togglePlay} tabIndex={-1}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <button className={styles.skipBtn} onClick={() => skip(10)} tabIndex={-1}><IconFwd10 /></button>
          </div>

          {/* Slider volumen */}
          <div className={styles.sideSlider}>
            <input
              type="range" min="0" max="1" step="0.01"
              value={volume}
              onChange={e => changeVolume(parseFloat(e.target.value))}
              className={styles.verticalSlider}
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              tabIndex={-1}
            />
            <div className={styles.sliderIconBottom}><IconVolume /></div>
          </div>
        </div>

        {/* ── Barra de progreso ── */}
        <div className={styles.footer}>
          <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
          <div className={styles.progressWrap} ref={progressRef} onMouseDown={onProgressStart} onTouchStart={onProgressStart}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              <div className={styles.progressDot} style={{ left: `${progress}%` }} />
            </div>
          </div>
          <span className={styles.timeLabel}>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
