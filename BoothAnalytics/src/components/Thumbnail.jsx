import { useBoothThumbnail } from '../hooks/useBoothThumbnail'
import './Thumbnail.css'

// size を省略すると inline style なし → CSS で自由にサイズ制御できる
export default function Thumbnail({ imageUrl, itemId, alt = '', size, className = '' }) {
  const url = useBoothThumbnail(imageUrl ? null : itemId, imageUrl)
  const style = size != null ? { width: size, height: size } : undefined

  if (!url) {
    return (
      <div className={`thumb-placeholder ${className}`} style={style}>
        📦
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`thumb-img ${className}`}
      style={style}
      loading="lazy"
      onError={e => { e.currentTarget.style.display = 'none' }}
    />
  )
}
