// src/components/PhotoModal.jsx
// props:
//   photoModal   : { urls: string[], index: number } | null
//   setPhotoModal: setter

function PhotoModal({ photoModal, setPhotoModal }) {
  if (!photoModal) return null

  return (
    // 背景（クリックで閉じる）
    <div
      onClick={() => setPhotoModal(null)}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      {/* 中央コンテンツ（クリックが背景に伝わらないよう stopPropagation） */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }}
      >
        {/* 写真 */}
        <img
          src={photoModal.urls[photoModal.index]}
          alt={`写真${photoModal.index + 1}`}
          style={{
            maxWidth: '90vw', maxHeight: '80vh',
            borderRadius: '12px', display: 'block',
            objectFit: 'contain',
          }}
        />

        {/* ✕ 閉じるボタン */}
        <button
          onClick={() => setPhotoModal(null)}
          style={{
            position: 'absolute', top: '-14px', right: '-14px',
            width: '32px', height: '32px',
            borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)',
            color: 'white', fontSize: '16px',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* 左矢印ボタン（1枚目は非表示） */}
        {photoModal.urls.length > 1 && photoModal.index > 0 && (
          <button
            onClick={() => setPhotoModal(m => ({ ...m, index: m.index - 1 }))}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
            style={{
              position: 'absolute', left: '8px', top: '50%',
              transform: 'translateY(-50%)',
              width: '48px', height: '48px',
              borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.5)',
              color: 'white', fontSize: '24px',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>
        )}

        {/* 右矢印ボタン（最後の枚は非表示） */}
        {photoModal.urls.length > 1 && photoModal.index < photoModal.urls.length - 1 && (
          <button
            onClick={() => setPhotoModal(m => ({ ...m, index: m.index + 1 }))}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
            style={{
              position: 'absolute', right: '8px', top: '50%',
              transform: 'translateY(-50%)',
              width: '48px', height: '48px',
              borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.5)',
              color: 'white', fontSize: '24px',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        )}

        {/* 枚数カウンター（画像下部中央・14px） */}
        {photoModal.urls.length > 1 && (
          <div style={{
            position: 'absolute', bottom: '-32px', left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.7)', fontSize: '14px',
            whiteSpace: 'nowrap',
          }}>
            {photoModal.index + 1} / {photoModal.urls.length}
          </div>
        )}
      </div>
    </div>
  )
}

export default PhotoModal
