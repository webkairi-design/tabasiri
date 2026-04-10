// src/components/NearbyPanel.jsx
// props:
//   nearbyPanelOpen  : boolean
//   nearbyPins       : pin[] （distKm付き、距離順）
//   nearbyRadius     : number（5 / 10 / 20）
//   onClose          : () => void
//   onRadiusChange   : (km: number) => void
//   onPinClick       : (pin) => void
import { CATEGORIES, PIN_TYPES, PIN_COLORS } from '../constants'

// 距離を読みやすい文字列に変換（例：300m / 12.5km）
function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

function NearbyPanel({ nearbyPanelOpen, nearbyPins, nearbyRadius, onClose, onRadiusChange, onPinClick }) {
  if (!nearbyPanelOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '320px',
      height: '100vh',
      background: '#141414',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'sans-serif',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
      animation: 'slideInRight 0.22s ease',
    }}>
      {/* CSSアニメーション定義 */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* パネルヘッダー */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
            📡 周辺のピン
          </div>
          <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
            現在地から{nearbyRadius}km以内・{nearbyPins.length}件
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '20px',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '4px',
          }}
        >✕</button>
      </div>

      {/* 範囲切り替えボタン */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: '6px',
        flexShrink: 0,
      }}>
        {[5, 10, 20].map((km) => (
          <button
            key={km}
            onClick={() => onRadiusChange(km)}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: '20px',
              border: nearbyRadius === km
                ? '1px solid white'
                : '1px solid rgba(255,255,255,0.2)',
              background: nearbyRadius === km ? 'white' : 'transparent',
              color: nearbyRadius === km ? '#111' : '#aaa',
              fontSize: '12px',
              fontWeight: nearbyRadius === km ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            {km}km
          </button>
        ))}
      </div>

      {/* ピン一覧（スクロール可能） */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {nearbyPins.length === 0 ? (
          <div style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: '#555',
            fontSize: '13px',
            lineHeight: '1.6',
          }}>
            この範囲にピンはありません<br />
            <span style={{ fontSize: '11px' }}>範囲を広げてみてください</span>
          </div>
        ) : (
          nearbyPins.map((pin) => {
            const cat     = CATEGORIES.find(c => c.key === pin.category)
            const pinType = PIN_TYPES.find(t => t.key === pin.type)
            const color   = PIN_COLORS[pin.type] || '#888'
            return (
              <div
                key={pin.id}
                onClick={() => onPinClick(pin)}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                {/* カテゴリ絵文字（丸アイコン） */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: `${color}22`,
                  border: `1px solid ${color}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  {cat ? cat.emoji : '📍'}
                </div>

                {/* 右側の情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 1行目：カテゴリ名 ＋ 距離 */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}>
                    <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
                      {cat ? cat.label : 'その他'}
                    </span>
                    <span style={{ color: '#FF4500', fontSize: '12px', fontWeight: 'bold', flexShrink: 0, marginLeft: '6px' }}>
                      {formatDist(pin.distKm)}
                    </span>
                  </div>

                  {/* 2行目：ピン種類バッジ */}
                  {pinType && (
                    <span style={{
                      display: 'inline-block',
                      fontSize: '10px',
                      color: color,
                      border: `1px solid ${color}`,
                      borderRadius: '10px',
                      padding: '1px 7px',
                      marginBottom: pin.comment ? '4px' : '0',
                    }}>
                      {pinType.label}
                    </span>
                  )}

                  {/* 3行目：コメント（あれば） */}
                  {pin.comment && (
                    <div style={{
                      color: '#999',
                      fontSize: '12px',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      💬 {pin.comment}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default NearbyPanel
