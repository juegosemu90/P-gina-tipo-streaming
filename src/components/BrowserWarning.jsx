import { useState, useEffect } from 'react'
import styles from './BrowserWarning.module.css'

const STORAGE_KEY = 'rosatv_browser_warning_dismissed'

function isProblematicBrowser() {
  const ua = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
  if (!isMobile) return false
  const isFirefox = /Firefox/i.test(ua)
  return !isFirefox
}

export default function BrowserWarning() {
  const [visible, setVisible] = useState(false)
  const [dontShow, setDontShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed && isProblematicBrowser()) {
      setVisible(true)
    }
  }, [])

  const handleClose = () => {
    if (dontShow) localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.icon}>⚠️</div>
        <h2 className={styles.title}>Aviso importante</h2>
        <p className={styles.text}>
          Para que los episodios funcionen correctamente en tu celular, necesitas usar <strong>Firefox</strong>.
        </p>
        <p className={styles.text}>
          En otros navegadores como Chrome o Safari, los videos pueden quedarse cargando o congelarse durante la reproducción. Esto se soluciona cambiando a Firefox.
        </p>
        <a
          className={styles.downloadBtn}
          href="https://play.google.com/store/apps/details?id=org.mozilla.firefox"
          target="_blank"
          rel="noopener noreferrer"
        >
          Descargar Firefox
        </a>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={dontShow}
            onChange={e => setDontShow(e.target.checked)}
            className={styles.checkbox}
          />
          No mostrar más
        </label>
        <button className={styles.closeBtn} onClick={handleClose}>
          Entendido, continuar de todas formas
        </button>
      </div>
    </div>
  )
}
