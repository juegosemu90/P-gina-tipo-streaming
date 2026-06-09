import { Home, Heart } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar({ page, setPage, favCount }) {
  return (
    <nav className={styles.nav}>
      <a className={styles.logo} href="#" onClick={e => e.preventDefault()}>
        <div className={styles.logoIcon}>🌹</div>
        <div className={styles.logoText}>
          RosaTV
          <span>Streaming Sagrado</span>
        </div>
      </a>

      <ul className={styles.links}>
        <li>
          <button
            className={`${styles.link} ${page === 'inicio' ? styles.active : ''}`}
            onClick={() => setPage('inicio')}
          >
            <Home size={16} />
            Inicio
          </button>
        </li>
        <li>
          <button
            className={`${styles.link} ${page === 'favoritos' ? styles.active : ''}`}
            onClick={() => setPage('favoritos')}
          >
            <Heart size={16} />
            Favoritos
            {favCount > 0 && (
              <span className={styles.badge}>{favCount}</span>
            )}
          </button>
        </li>
      </ul>

      <div className={styles.spacer} />

      <div className={styles.avatar}>M</div>
    </nav>
  )
}
