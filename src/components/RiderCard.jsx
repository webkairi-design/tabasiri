// src/components/RiderCard.jsx
// props:
//   riderCard   : pin オブジェクト | null
//   riderProfile: profile オブジェクト | null（null = ロード中、{} = 取得失敗）
//   user        : 現在ログイン中のユーザー（自分のピン判定用）
//   onClose     : () => void  ✕ボタン押下
//   onDelete    : () => void  削除ボタン押下
//   onPhotoClick: (urls, index) => void  写真タップでモーダルを開く
import { useState, useEffect } from 'react'
import { CATEGORIES, PIN_TYPES, PIN_COLORS } from '../constants'
import { supabase } from '../lib/supabase'

// リアクションで使う絵文字の定義
const REACTION_EMOJIS = ['🔥', '😋', '😆', '🏍️']

// 天気コード（WMO）を絵文字＋ラベルに変換する
function getWeatherLabel(code) {
  if (code === 0)                                          return '☀️ 快晴'
  if ([1, 2, 3].includes(code))                           return '🌤️ 晴れ'
  if ([45, 48].includes(code))                            return '🌫️ 霧'
  if ([51,53,55,61,63,65,80,81,82].includes(code))        return '🌧️ 雨'
  if ([71,73,75,77,85,86].includes(code))                 return '🌨️ 雪'
  if ([95, 96, 99].includes(code))                        return '⛈️ 雷雨'
  return '🌥️ 曇り'
}

function RiderCard({ riderCard, riderProfile, user, onClose, onDelete, onPhotoClick }) {
  // reactions: { emoji: string, count: number, myReactionId: string|null }[]
  const [reactions, setReactions] = useState([])
  const [reactionLoading, setReactionLoading] = useState(false)

  // ── ライダーカードが開くたびにリアクションを取得 ──
  useEffect(() => {
    if (!riderCard) { setReactions([]); return }
    fetchReactions(riderCard.id)
  }, [riderCard?.id])

  // pin_reactions テーブルから該当ピンの全リアクションを取得し、
  // 絵文字ごとに「件数」と「自分のリアクションID」を集計する
  async function fetchReactions(pinId) {
    const { data, error } = await supabase
      .from('pin_reactions')
      .select('id, emoji, user_id')
      .eq('pin_id', pinId)
    if (error) { console.error('リアクション取得エラー:', error); return }

    const summary = REACTION_EMOJIS.map((emoji) => {
      const rows = data.filter(r => r.emoji === emoji)
      const mine = user ? rows.find(r => r.user_id === user.id) : null
      return {
        emoji,
        count: rows.length,
        myReactionId: mine ? mine.id : null,
      }
    })
    setReactions(summary)
  }

  // ボタン押下：自分のリアクションがあれば DELETE、なければ INSERT → 再取得
  async function handleReaction(emoji) {
    if (!user || !riderCard || reactionLoading) return
    setReactionLoading(true)

    const current = reactions.find(r => r.emoji === emoji)

    if (current?.myReactionId) {
      // すでに押している → 解除（DELETE）
      const { error } = await supabase
        .from('pin_reactions')
        .delete()
        .eq('id', current.myReactionId)
      if (error) console.error('リアクション削除エラー:', error)
    } else {
      // まだ押していない → 追加（INSERT）
      const { error } = await supabase
        .from('pin_reactions')
        .insert({ pin_id: riderCard.id, user_id: user.id, emoji })
      if (error) console.error('リアクション追加エラー:', error)
    }

    await fetchReactions(riderCard.id)
    setReactionLoading(false)
  }

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

      {/* 天気・気温（投稿時に取得済みの場合のみ表示） */}
      {riderCard.weather_code != null && riderCard.temperature != null && (
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>
          {getWeatherLabel(riderCard.weather_code)} / {riderCard.temperature}℃
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

      {/* ── リアクションボタン（ログイン時のみ表示） ── */}
      {user && (
        <div style={{
          display: 'flex',
          gap: '6px',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {reactions.map(({ emoji, count, myReactionId }) => {
            const isActive = !!myReactionId
            return (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                disabled={reactionLoading}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  borderRadius: '10px',
                  border: isActive
                    ? '1.5px solid rgba(255,255,255,0.6)'
                    : '1.5px solid rgba(255,255,255,0.12)',
                  background: isActive
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  color: 'white',
                  cursor: reactionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'background 0.15s, border 0.15s',
                  fontFamily: 'sans-serif',
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: '11px',
                    color: isActive ? 'white' : '#aaa',
                    fontWeight: isActive ? 'bold' : 'normal',
                    minWidth: '10px',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

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
