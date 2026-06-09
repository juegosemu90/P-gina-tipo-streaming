import styles from './Inicio.module.css'

export default function Inicio() {
  return (
    <div className={styles.wrapper}>
      {/* Roseta SVG */}
      <div className={styles.rosette}>
        <svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="rg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f0abfc" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>
          </defs>
          <g transform="translate(55,55)">
            {[0,45,90,135,180,225,270,315].map(angle => (
              <ellipse
                key={angle}
                cx="0" cy="-22"
                rx="8" ry="16"
                fill="url(#rg)"
                opacity=".85"
                transform={`rotate(${angle})`}
              />
            ))}
            <circle cx="0" cy="0" r="12" fill="#f5c842" />
            <circle cx="0" cy="0" r="6" fill="#0D0A1A" />
          </g>
        </svg>
      </div>

      <h1 className={styles.title}>Aún en Progreso</h1>
      <p className={styles.sub}>Estamos preparando algo milagroso para ti</p>

      <div className={styles.dots}>
        <span /><span /><span />
      </div>

      {/* Anillo giratorio */}
      <svg className={styles.ring} viewBox="0 0 64 64">
        <circle className={styles.ringTrack} cx="32" cy="32" r="25" />
        <circle className={styles.ringFill}  cx="32" cy="32" r="25" />
      </svg>
    </div>
  )
}
