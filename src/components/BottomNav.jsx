import { Home, Star, Search, Menu } from 'lucide-react'
import styles from './BottomNav.module.css'

export default function BottomNav({ active = 'inicio', onSearch }) {
  const items = [
    { key: 'inicio',    label: 'INICIO',    Icon: Home,   onClick: () => { window.location.hash = '/inicio' } },
    { key: 'favoritos', label: 'Favoritos', Icon: Star,   onClick: () => {} },
    { key: 'buscar',    label: 'Buscar',    Icon: Search, onClick: () => onSearch?.() },
    { key: 'mas',       label: 'Más',       Icon: Menu,   onClick: () => {} },
  ]

  return (
    <nav className={styles.bottomNav}>
      {items.map(({ key, label, Icon, onClick }) => (
        <button
          key={key}
          className={`${styles.navBtn} ${active === key ? styles.navBtnActive : ''}`}
          onClick={onClick}
        >
          <Icon size={22} strokeWidth={active === key ? 2.3 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
