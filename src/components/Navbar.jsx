import { Home, Heart, Search } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar({ page, setPage }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navRow}>
        <a className={styles.logo} href="#" onClick={e => e.preventDefault()}>
          <div className={styles.logoIcon}>🌹</div>
        </a>

        <ul className={styles.links}>
          <li>
            <button
              className={`${styles.link} ${page === 'inicio' ? styles.active : ''}`}
              onClick={() => setPage('inicio')}
            >
              <Home size={16} /> Inicio
            </button>
          </li>
          <li>
            <button
              className={`${styles.link} ${page === 'favoritos' ? styles.active : ''}`}
              onClick={() => setPage('favoritos')}
            >
              <Heart size={16} /> Favoritos
            </button>
          </li>
        </ul>

        <div className={styles.spacer} />

        {/* Lupa — solo busqueda, sin acceso admin */}
        <button className={styles.searchBtn} title="Buscar">
          <Search size={20} color="white" />
        </button>
      </div>

      <div className={styles.gradientLine} />
    </nav>
  )
}
