import styles from './Navbar.module.css'

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.navRow}>
        <a className={styles.logo} href="#" onClick={e => e.preventDefault()}>
          <div className={styles.logoIcon}>🌹</div>
        </a>
      </div>
    </nav>
  )
}
