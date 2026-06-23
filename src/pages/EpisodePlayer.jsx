import { ArrowLeft } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import VideoPlayerAdvanced from '../components/VideoPlayerAdvanced'
import styles from './EpisodePlayer.module.css'

export default function EpisodePlayer({ episode, onBack, playerConfig = {} }) {
  const isAdvanced = playerConfig.style === 'advanced'

  return (
    <div className={styles.wrapper}>

      {!isAdvanced && (
        <button className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} />
          Volver
        </button>
      )}

      {isAdvanced ? (
        <VideoPlayerAdvanced
          key={episode.id}
          url={episode.youtubeUrl}
          title={episode.title}
          onBack={onBack}
          playerConfig={playerConfig}
          episodeId={episode.id}
        />
      ) : (
        <VideoPlayer
          key={episode.id}
          url={episode.youtubeUrl}
          title={episode.title}
          playerConfig={playerConfig}
          episodeId={episode.id}
        />
      )}

    </div>
  )
}
