// src/components/PostPanel.jsx
// props:
//   clickedLatLng     : { lat, lng } | null
//   step              : 1 | 2
//   pinType           : string
//   category          : string
//   comment           : string
//   convertToVisited  : boolean
//   selectedImages    : [File|null, File|null]
//   posting           : boolean
//   fileInputRefs     : [ref, ref]
//   onCancel          : () => void  キャンセルボタン
//   onNextStep        : () => void  次へボタン
//   onPrevStep        : () => void  戻るボタン
//   onPinTypeChange   : (key: string) => void
//   onCategoryChange  : (key: string) => void
//   onCommentChange   : (value: string) => void
//   onConvertChange   : (value: boolean) => void
//   onImageSelect     : (index, e) => void
//   onImageRemove     : (index) => void
//   onPost            : () => void
import { CATEGORIES, PIN_TYPES, PIN_COLORS } from '../constants'

function PostPanel({
  clickedLatLng,
  step,
  pinType,
  category,
  comment,
  convertToVisited,
  selectedImages,
  posting,
  fileInputRefs,
  onCancel,
  onNextStep,
  onPrevStep,
  onPinTypeChange,
  onCategoryChange,
  onCommentChange,
  onConvertChange,
  onImageSelect,
  onImageRemove,
  onPost,
}) {
  if (!clickedLatLng) return null

  const currentColor = PIN_COLORS[pinType]

  return (
    <div style={{
      position: 'fixed', bottom: '0', left: '50%', transform: 'translateX(-50%)',
      background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '16px 16px 0 0', padding: '16px 24px 32px',
      zIndex: 1000, width: '360px', fontFamily: 'sans-serif', color: 'white',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      maxHeight: '85vh', overflowY: 'auto',
    }}>
      {/* ドラッグバー */}
      <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 12px' }} />

      {/* ステップインジケーター */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step === 2 ? 'white' : 'rgba(255,255,255,0.3)' }} />
      </div>

      {/* ── ステップ1：ピンの種類 ── */}
      {step === 1 && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>ピンの種類</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {PIN_TYPES.map((type) => {
                const isSelected = pinType === type.key
                return (
                  <button key={type.key} onClick={() => onPinTypeChange(type.key)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: '8px',
                    border: isSelected ? `2px solid ${PIN_COLORS[type.key]}` : '2px solid rgba(255,255,255,0.15)',
                    background: isSelected ? `${PIN_COLORS[type.key]}22` : 'transparent',
                    color: 'white', cursor: 'pointer', fontSize: '11px', textAlign: 'center', lineHeight: '1.4',
                  }}>{type.label}</button>
                )
              })}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '6px', textAlign: 'center' }}>
              {PIN_TYPES.find(t => t.key === pinType)?.desc}
            </div>
          </div>

          {/* 24時間後どうする？（アニメーションで展開） */}
          <div style={{
            overflow: 'hidden',
            maxHeight: pinType === 'now' ? '120px' : '0px',
            opacity: pinType === 'now' ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.3s ease',
            marginBottom: pinType === 'now' ? '14px' : '0px',
          }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>24時間後どうする？</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onConvertChange(false)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '8px',
                  border: !convertToVisited ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.15)',
                  background: !convertToVisited ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: 'white', cursor: 'pointer', fontSize: '11px', textAlign: 'center', lineHeight: '1.4',
                }}
              >そのまま消える</button>
              <button
                onClick={() => onConvertChange(true)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '8px',
                  border: convertToVisited ? '2px solid #00C853' : '2px solid rgba(255,255,255,0.15)',
                  background: convertToVisited ? '#00C85322' : 'transparent',
                  color: 'white', cursor: 'pointer', fontSize: '11px', textAlign: 'center', lineHeight: '1.4',
                }}
              >訪問済みに変換する</button>
            </div>
          </div>

          {/* キャンセル＋次へボタン */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onCancel} style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
              color: 'white', cursor: 'pointer', fontSize: '14px',
            }}>キャンセル</button>
            <button onClick={onNextStep} style={{
              flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
              background: currentColor, color: 'white',
              cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
            }}>次へ →</button>
          </div>
        </>
      )}

      {/* ── ステップ2：詳細入力 ── */}
      {step === 2 && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>カテゴリ</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.key
                return (
                  <button key={cat.key} onClick={() => onCategoryChange(cat.key)} style={{
                    padding: '5px 10px', borderRadius: '20px',
                    border: isSelected ? '1px solid white' : '1px solid rgba(255,255,255,0.2)',
                    background: isSelected ? 'white' : 'transparent',
                    color: isSelected ? '#111' : '#aaa',
                    cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap',
                  }}>{cat.emoji} {cat.label}</button>
                )
              })}
            </div>
          </div>

          <input type="text" placeholder="一言コメント（任意）" value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
              color: 'white', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box',
            }}
          />

          {/* 写真選択エリア */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>📷 写真を追加（最大2枚）</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 1].map((index) => {
                const file = selectedImages[index]
                const previewUrl = file ? URL.createObjectURL(file) : null
                return (
                  <div key={index} style={{ position: 'relative' }}>
                    <input
                      ref={fileInputRefs[index]}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => onImageSelect(index, e)}
                      style={{ display: 'none' }}
                    />
                    <div
                      onClick={() => !file && fileInputRefs[index].current?.click()}
                      style={{
                        width: '80px', height: '80px',
                        borderRadius: '8px',
                        border: file ? 'none' : '2px dashed rgba(255,255,255,0.2)',
                        background: file ? 'transparent' : 'rgba(255,255,255,0.03)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: file ? 'default' : 'pointer',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {previewUrl
                        ? <img src={previewUrl} alt={`プレビュー${index + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.2)' }}>＋</span>
                      }
                    </div>
                    {file && (
                      <button
                        onClick={() => onImageRemove(index)}
                        style={{
                          position: 'absolute', top: '-6px', right: '-6px',
                          width: '20px', height: '20px',
                          borderRadius: '50%', border: 'none',
                          background: 'rgba(0,0,0,0.8)',
                          color: 'white', fontSize: '11px',
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      >✕</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onPrevStep} style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
              color: 'white', cursor: 'pointer', fontSize: '14px',
            }}>← 戻る</button>
            <button onClick={onPost} disabled={posting} style={{
              flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
              background: currentColor, color: 'white', cursor: 'pointer',
              fontSize: '14px', fontWeight: 'bold',
            }}>{posting ? '投稿中...' : '投稿する'}</button>
          </div>
        </>
      )}
    </div>
  )
}

export default PostPanel
