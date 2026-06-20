import { Search } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar({ onSearch }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.navRow}>
        <a className={styles.logo} href="#" onClick={e => e.preventDefault()}>
          <div className={styles.logoIcon}>🌹</div>
        </a>
        <div className={styles.spacer} />
        <button className={styles.searchBtn} onClick={onSearch}>
          <Search size={20} color="white" />
        </button>
      </div>
      <div className={styles.gradientLine} />
    </nav>
  )
}
