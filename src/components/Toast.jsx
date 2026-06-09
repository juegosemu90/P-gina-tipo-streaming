import { useEffect } from 'react'
import { Heart } from 'lucide-react'
import styles from './Toast.module.css'

export default function Toast({ message, visible }) {
  return (
    <div className={`${styles.toast} ${visible ? styles.show : ''}`}>
      <Heart size={15} />
      <span>{message}</span>
    </div>
  )
}
