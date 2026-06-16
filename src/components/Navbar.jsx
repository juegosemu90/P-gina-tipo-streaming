import { Home, Heart } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar({ page, setPage }) {
  return (
    <>
      {/* Barra superior — solo logo */}
      <nav className={styles.nav}>
        <div className={styles.navRow}>
          <a className={styles.logo} href="#" onClick={e => e.preventDefault()}>
            <div className={styles.logoIcon}>🌹</div>
          </a>
          <div className={styles.spacer} />
        </div>
        <div className={styles.gradientLine} />
      </nav>

      {/* Barra inferior — navegación */}
      <div className={styles.bottomNav}>
        <button
          className={`${styles.bottomBtn} ${page === 'inicio' ? styles.bottomActive : ''}`}
          onClick={() => setPage('inicio')}
        >
          <Home size={22} />
          <span>Inicio</span>
        </button>
        <button
          className={`${styles.bottomBtn} ${page === 'favoritos' ? styles.bottomActive : ''}`}
          onClick={() => setPage('favoritos')}
        >
          <Heart size={22} />
          <span>Favoritos</span>
        </button>
      </div>
    </>
  )
}
