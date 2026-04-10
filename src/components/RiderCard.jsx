// src/components/RiderCard.jsx
// props:
//   riderCard   : pin オブジェクト | null
//   riderProfile: profile オブジェクト | null（null = ロード中、{} = 取得失敗）
//   user        : 現在ログイン中のユーザー（自分のピン判定用）
//   onClose     : () => void  ✕ボタン押下
//   onDelete    : () => void  削除ボタン押下
//   onPhotoClick: (urls, index) => void  写真タップでモーダルを開く
import { CATEGORIES, PIN_TYPES, PIN_COLORS } from '../constants'

function RiderCard({ riderCard, riderProfile, user, onClose, onDelete, onPhotoClick }) {
  if (!riderCard) return null

  const cardType  = PIN_TYPES.find(t => t.key === riderCard.type)
  const cardColor = PIN_COLORS[riderCard.type] || '#888'
  const cardCat   = CATEGORIES.find(c => c.key === riderCard.category)
  const isMyPin   = user && riderCard.user_id === user.id

  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: '#1a1a1a', border: `1px solid ${cardColor}44`,
      borderRadius: '16px', padding: '20px 24px',
      zIndex: 1000, width: '320px', fontFamily: 'sans-serif', color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <button onClick={onClose}
        style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
      >✕</button>

      {/* ピン種類 ＋ カテゴリバッジ */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ background: `${cardColor}22`, border: `1px solid ${cardColor}`, color: cardColor, borderRadius: '20px', padding: '3px 12px', fontSize: '12px', fontWeight: 'bold' }}>
          {cardType ? cardType.label : riderCard.type}
        </div>
        {cardCat && (
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ccc', borderRadius: '20px', padding: '3px 12px', fontSize: '12px' }}>
            {cardCat.emoji} {cardCat.label}
          </div>
        )}
      </div>

      {/* アバター ＋ ライダー情報 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: riderProfile === null ? 'rgba(255,255,255,0.1)' : cardColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0,
          border: `2px solid ${cardColor}`,
          overflow: 'hidden',
        }}>
          {riderProfile === null ? null
            : riderProfile.avatar_url
              ? <img src={riderProfile.avatar_url} alt="アイコン"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏍️'
          }
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
            {riderProfile === null ? '読み込み中...' : (riderProfile.username || 'ライダー')}
          </div>
          {riderProfile?.bike_model && (
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>🏍️ {riderProfile.bike_model}</div>
          )}
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            {new Date(riderCard.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* コメント */}
      {riderCard.comment && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#ddd', lineHeight: '1.5' }}>
          💬 {riderCard.comment}
        </div>
      )}

      {/* 写真サムネイル（タップでモーダルを開く） */}
      {riderCard.image_urls && riderCard.image_urls.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
          {riderCard.image_urls.map((url, i) => (
            <div
              key={i}
              onClick={() => onPhotoClick(riderCard.image_urls, i)}
              style={{ flex: 1, height: '120px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
            >
              <img src={url} alt={`写真${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      )}

      {/* 座標表示 */}
      <div style={{ fontSize: '11px', color: '#555', marginTop: '10px', textAlign: 'right' }}>
        {riderCard.lat.toFixed(4)}, {riderCard.lng.toFixed(4)}
      </div>

      {/* 削除ボタン（自分のピンのみ） */}
      {isMyPin && (
        <button onClick={onDelete} style={{
          marginTop: '12px',
          width: '100%',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 59, 48, 0.4)',
          background: 'rgba(255, 59, 48, 0.15)',
          color: 'rgba(255, 59, 48, 0.8)',
          cursor: 'pointer',
          fontSize: '13px',
          fontFamily: 'sans-serif',
        }}>🗑️ このピンを削除</button>
      )}
    </div>
  )
}

export default RiderCard
