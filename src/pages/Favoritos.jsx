import { Heart } from 'lucide-react'
import EpisodeCard from '../components/EpisodeCard'
import styles from './Favoritos.module.css'

export default function Favoritos({ favorites, onToggleFav }) {
  return (
    <div>
      <div className={styles.header}>
        <h1>Mis Favoritos</h1>
        <p>Episodios que guardaste para volver a ver</p>
      </div>

      {favorites.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Heart size={28} />
          </div>
          <h3>Sin favoritos aún</h3>
          <p>Cuando el contenido esté disponible, podrás guardar tus episodios aquí.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {favorites.map(ep => (
            <EpisodeCard
              key={ep.id}
              episode={ep}
              onToggleFav={() => onToggleFav(ep.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
