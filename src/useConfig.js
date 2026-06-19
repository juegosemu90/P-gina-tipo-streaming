import { useEffect, useState } from 'react'
import { db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'

const DEFAULT = {
  primaryColor: '#C084FC',
  accentColor: '#F5C842',
  navbarBg: '#000000',
  pageTitle: 'RosaTV',
  featuredCount: '6',
}

const DEFAULT_PLAYER = {
  style: 'classic',
  progressColor: '#cc0000',
  controlsBg: 'rgba(0,0,0,0.82)',
  scrubberShape: 'square',
  autoHide: '3',
  advAccentColor: '#f97316',
  advProgressGradientStart: '#38bdf8',
  advProgressGradientEnd: '#f472b6',
  advButtonSize: 'medium',
  advOverlayOpacity: '0.55',
}

export function useConfig() {
  const [config, setConfig] = useState(DEFAULT)
  const [playerConfig, setPlayerConfig] = useState(DEFAULT_PLAYER)

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getDoc(doc(db, 'config', 'settings'))
        if (s.exists()) setConfig(c => ({ ...c, ...s.data() }))
        const p = await getDoc(doc(db, 'config', 'player'))
        if (p.exists()) setPlayerConfig(c => ({ ...c, ...p.data() }))
      } catch (e) {}
    }
    load()
  }, [])

  // Aplicar colores como CSS variables globales
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--rose',       config.primaryColor)
    r.setProperty('--rose-light', config.primaryColor + 'dd')
    r.setProperty('--rose-glow',  config.primaryColor + '33')
    r.setProperty('--gold',       config.accentColor)
    r.setProperty('--border',     config.primaryColor + '30')
    document.title = config.pageTitle + ' — La Rosa de Guadalupe'
  }, [config])

  return { config, playerConfig }
}
