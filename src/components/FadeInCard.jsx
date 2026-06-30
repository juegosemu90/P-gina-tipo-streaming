import { useEffect, useRef, useState } from 'react'
import styles from './FadeInCard.module.css'

/**
 * Envuelve cualquier tarjeta y la hace aparecer con un fade puro
 * (sin movimiento, sin escala) la primera vez que entra en pantalla.
 * Cubre tanto la carga inicial de la página como el scroll posterior.
 */
export default function FadeInCard({ children, className = '', delay = 0, as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect() // solo aparece una vez, no se repite al salir/entrar de nuevo
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`${styles.fadeCard} ${visible ? styles.fadeCardVisible : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
