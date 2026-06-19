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
const IconFullscreen = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
const IconFullscreenExit = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>

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

const BTN_SIZES = {
  small:  { skip: 38, play: 54, icon: 22 },
  medium: { skip: 46, play: 64, icon: 28 },
  large:  { skip: 56, play: 76, icon: 34 },
}

export default function VideoPlayerAdvanced({ url, title, seasonLabel, episodeLabel, onBack, playerConfig = {} }) {
  const {
    advAccentColor           = '#f97316',
    advProgressGradientStart = '#38bdf8',
    advProgressGradientEnd   = '#f472b6',
    advButtonSize            = 'medium',
    advOverlayOpacity        = '0.55',
  } = playerConfig

  const sizes = BTN_SIZES[advButtonSize] || BTN_SIZES.medium

  const videoRef     = useRef(null)
  const containerRef = useRef(null)
  const progressRef  = useRef(null)
  const hideTimer     = useRef(null)
  const isDragging    = useRef(false)

  const [playing,      setPlaying]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [progress,     setProgress]     = useState(0)
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.()
    else document.exitFullscreen?.()
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

  const overlayGradient = `linear-gradient(to bottom, rgba(0,0,0,${advOverlayOpacity}) 0%, transparent 22%, transparent 70%, rgba(0,0,0,${advOverlayOpacity}) 100%)`

  return (
    <div
      ref={containerRef}
      className={`${styles.player} ${isFullscreen ? styles.fullscreen : ''}`}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlay}
    >
      <video ref={videoRef} className={styles.video} src={url} playsInline />

      <div
        className={`${styles.uiLayer} ${showControls ? styles.visible : ''}`}
        style={{ background: overlayGradient }}
        onClick={e => e.stopPropagation()}
      >

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

        {/* ── Controles centrales — tamaño configurable ── */}
        <div className={styles.body}>
          <div className={styles.centerControls}>
            <button
              className={styles.skipBtn}
              style={{ width: sizes.skip, height: sizes.skip }}
              onClick={() => skip(-10)} tabIndex={-1}
            >
              <IconBack10 />
            </button>
            <button
              className={styles.playBtn}
              style={{ width: sizes.play, height: sizes.play }}
              onClick={togglePlay} tabIndex={-1}
            >
              <div style={{ width: sizes.icon, height: sizes.icon }}>
                {playing ? <IconPause /> : <IconPlay />}
              </div>
            </button>
            <button
              className={styles.skipBtn}
              style={{ width: sizes.skip, height: sizes.skip }}
              onClick={() => skip(10)} tabIndex={-1}
            >
              <IconFwd10 />
            </button>
          </div>
        </div>

        {/* ── Barra de progreso + pantalla completa ── */}
        <div className={styles.footer}>
          <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
          <div className={styles.progressWrap} ref={progressRef} onMouseDown={onProgressStart} onTouchStart={onProgressStart}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${advProgressGradientStart}, ${advProgressGradientEnd})`
                }}
              />
              <div
                className={styles.progressDot}
                style={{
                  left: `${progress}%`,
                  background: advAccentColor,
                  boxShadow: `0 0 0 3px ${advAccentColor}40`
                }}
              />
            </div>
          </div>
          <span className={styles.timeLabel}>{formatTime(duration)}</span>

          <button className={styles.iconBtn} onClick={toggleFullscreen} tabIndex={-1}>
            {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
          </button>
        </div>
      </div>
    </div>
  )
}
