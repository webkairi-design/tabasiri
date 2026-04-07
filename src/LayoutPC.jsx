// src/LayoutPC.jsx
import { useState, useEffect, useRef } from 'react'
import MapPage from './pages/MapPage'
import MyPage from './pages/MyPage'
import { supabase } from './lib/supabase'
import { CATEGORIES, PIN_TYPES, PIN_COLORS } from './constants'

const SIDEBAR_WIDTH = 280

// 相対時間を返す関数（例：3分前・2時間前・1日前）
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day  = Math.floor(diff / 86400000)
  if (min  <  1) return 'たった今'
  if (min  < 60) return `${min}分前`
  if (hour < 24) return `${hour}時間前`
  return `${day}日前`
}

// ── ダミーライダーデータ（開発確認用） ──
// 本番リリース前にこの配列を [] に戻すか、makeDummyRiders()ごと削除してください
function makeDummyRiders() {
  const now = Date.now()
  return [
    {
      id: 'dummy-1',
      lat: 33.5902, lng: 130.4017,
      type: 'now', category: 'toge',
      created_at: new Date(now - 3   * 60000).toISOString(), // 3分前
      profile: { username: 'タカハシ走郎', bike_model: 'Honda CB400SF', avatar_url: null },
    },
    {
      id: 'dummy-2',
      lat: 35.6585, lng: 139.7454,
      type: 'visited', category: 'tenbodai',
      created_at: new Date(now - 18  * 60000).toISOString(), // 18分前
      profile: { username: 'やまびこライダー', bike_model: 'Yamaha MT-09', avatar_url: null },
    },
    {
      id: 'dummy-3',
      lat: 34.6937, lng: 135.5023,
      type: 'visited', category: 'onsen',
      created_at: new Date(now - 47  * 60000).toISOString(), // 47分前
      profile: { username: 'ゆけむり旅人', bike_model: 'Kawasaki Z900RS', avatar_url: null },
    },
    {
      id: 'dummy-4',
      lat: 43.0642, lng: 141.3469,
      type: 'now', category: 'michinoeki',
      created_at: new Date(now - 1.5 * 3600000).toISOString(), // 1.5時間前
      profile: { username: '北海道ソロツー', bike_model: 'Suzuki V-Strom 650', avatar_url: null },
    },
    {
      id: 'dummy-5',
      lat: 35.3606, lng: 138.7274,
      type: 'want', category: 'kanko',
      created_at: new Date(now - 3   * 3600000).toISOString(), // 3時間前
      profile: { username: 'フジゲン2輪', bike_model: 'BMW R1250GS', avatar_url: null },
    },
    {
      id: 'dummy-6',
      lat: 26.2124, lng: 127.6792,
      type: 'visited', category: 'umi',
      created_at: new Date(now - 5   * 3600000).toISOString(), // 5時間前
      profile: { username: '沖縄シーサイド', bike_model: 'Honda PCX160', avatar_url: null },
    },
  ]
}

function AppPC({ user, loading, signInWithGoogle, signOut }) {
  const [showMyPage, setShowMyPage] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null)
  const [recentRiders, setRecentRiders] = useState([])
  const mapInstanceRef = useRef(null) // 地図インスタンスを受け取るref

  // 最近ピンを立てたライダー一覧を取得
  useEffect(() => {
    async function fetchRecentRiders() {
      const now = new Date().toISOString()

      // 有効なピンを新しい順に取得
      const { data: pins, error } = await supabase
        .from('pins')
        .select('*')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })

      if (error) { console.error('ピン取得エラー:', error); return }

      // 1ライダー1件だけに絞る（最初に出てきた＝最新のもの優先）
      const seen = new Set()
      const uniquePins = []
      for (const pin of pins) {
        if (!seen.has(pin.user_id)) {
          seen.add(pin.user_id)
          uniquePins.push(pin)
        }
        if (uniquePins.length >= 10) break
      }

      // user_id ごとにプロフィールを取得
      const userIds = uniquePins.map(p => p.user_id)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      if (profileError) { console.error('プロフィール取得エラー:', profileError); return }

      // ピンとプロフィールを結合
      const realRiders = uniquePins.map(pin => ({
        ...pin,
        profile: profiles.find(p => p.id === pin.user_id) || {},
      }))

      // ダミーデータと結合して新しい順に並べ直す（最大10件）
      const combined = [...realRiders, ...makeDummyRiders()]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)

      setRecentRiders(combined)
    }

    fetchRecentRiders()
  }, [])

  // 行クリック時に地図をそのピンの場所にジャンプ
  function handleRiderClick(pin) {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([pin.lat, pin.lng], 15)
    }
  }

  return (
    <div style={{ position: 'relative' }}>

      {/* ── サイドバー ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${SIDEBAR_WIDTH}px`,
        height: '100vh',
        background: '#111111',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        zIndex: 900,
        overflowY: 'auto',
        fontFamily: 'sans-serif',
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 'bold',
        }}>
          🏍️ 最近のライダー
        </div>

        {/* ライダー一覧 */}
        {recentRiders.length === 0 ? (
          <div style={{ padding: '16px', color: '#555', fontSize: '12px' }}>
            まだ投稿がありません
          </div>
        ) : (
          recentRiders.map((pin) => {
            const cat     = CATEGORIES.find(c => c.key === pin.category)
            const pinType = PIN_TYPES.find(t => t.key === pin.type)
            const color   = PIN_COLORS[pin.type] || '#888'

            return (
              <div
                key={pin.id}
                onClick={() => handleRiderClick(pin)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  display: 'flex',         // ★ 横並びに変更
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* ★ 追加：左端のアイコン（36px丸形） */}
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  background: '#2a2a2a',
                  border: `1px solid ${color}55`,
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>
                  {pin.profile?.avatar_url
                    ? <img src={pin.profile.avatar_url} alt="アイコン"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🏍️'
                  }
                </div>

                {/* 右側：既存のライダー情報 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  {/* 1行目：ライダー名 ＋ 相対時間 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pin.profile?.username || 'ライダー'}
                    </span>
                    <span style={{ color: '#555', fontSize: '11px', flexShrink: 0, marginLeft: '6px' }}>
                      {timeAgo(pin.created_at)}
                    </span>
                  </div>

                  {/* 2行目：バイク車種 */}
                  {pin.profile?.bike_model && (
                    <div style={{ color: '#888', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🏍️ {pin.profile.bike_model}
                    </div>
                  )}

                  {/* 3行目：カテゴリ ＋ ピン種類（色付き） */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cat && (
                      <span style={{ color: '#aaa', fontSize: '12px' }}>
                        {cat.emoji} {cat.label}
                      </span>
                    )}
                    {pinType && (
                      <span style={{
                        fontSize: '11px',
                        color: color,
                        border: `1px solid ${color}`,
                        borderRadius: '10px',
                        padding: '1px 7px',
                        flexShrink: 0,
                      }}>
                        {pinType.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 地図エリア（サイドバー分だけ右にずらす） */}
      <div style={{ marginLeft: `${SIDEBAR_WIDTH}px` }}>
        <MapPage
          user={user}
          activeFilter={activeFilter}
          onMapReady={(mapInstance) => { mapInstanceRef.current = mapInstance }}
        />
      </div>

      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'sans-serif', zIndex: 500,
        }}>読み込み中...</div>
      )}

      {/* フィルターバー（地図エリアの中央に配置） */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: `${SIDEBAR_WIDTH}px`,
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 1000,
        pointerEvents: 'none', // バー外のクリックが地図に届くよう透過
      }}>
        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(20,20,20,0.85)',
          backdropFilter: 'blur(8px)',
          padding: '8px 12px',
          borderRadius: '40px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          maxWidth: `calc(100vw - ${SIDEBAR_WIDTH}px - 340px)`,
          overflowX: 'auto',
          flexShrink: 0,
          scrollbarWidth: 'none',
          pointerEvents: 'auto', // ボタン自体はクリック可能に戻す
        }}>
          <button onClick={() => setActiveFilter(null)} style={{
            padding: '5px 12px', borderRadius: '20px', flexShrink: 0,
            border: activeFilter === null ? '1px solid white' : '1px solid rgba(255,255,255,0.2)',
            background: activeFilter === null ? 'white' : 'transparent',
            color: activeFilter === null ? '#111' : '#aaa',
            cursor: 'pointer', fontSize: '12px',
            fontWeight: activeFilter === null ? 'bold' : 'normal',
            whiteSpace: 'nowrap', fontFamily: 'sans-serif',
          }}>すべて</button>

          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.key
            return (
              <button key={cat.key}
                onClick={() => setActiveFilter(isActive ? null : cat.key)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', flexShrink: 0,
                  border: isActive ? '1px solid white' : '1px solid rgba(255,255,255,0.2)',
                  background: isActive ? 'white' : 'transparent',
                  color: isActive ? '#111' : '#aaa',
                  cursor: 'pointer', fontSize: '12px',
                  whiteSpace: 'nowrap', fontFamily: 'sans-serif',
                  fontWeight: isActive ? 'bold' : 'normal',
                }}
              >{cat.emoji} {cat.label}</button>
            )
          })}
        </div>
      </div>

      {/* 右上ボタン */}
      {!loading && (
        <div style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {user ? (
            <>
              <button onClick={() => setShowMyPage(true)} style={{
                padding: '8px 16px', background: 'rgba(255,69,0,0.8)',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif',
                fontWeight: 'bold',
              }}>🏍️ マイページ</button>
              <span style={{
                color: 'white', background: 'rgba(0,0,0,0.6)',
                padding: '6px 12px', borderRadius: '8px',
                fontSize: '13px', fontFamily: 'sans-serif',
              }}>{user.email}</span>
              <button onClick={signOut} style={{
                padding: '8px 16px', background: 'rgba(0,0,0,0.6)',
                color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontFamily: 'sans-serif',
              }}>ログアウト</button>
            </>
          ) : (
            <button onClick={signInWithGoogle} style={{
              padding: '8px 20px', background: 'white', color: '#111',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 'bold',
              fontFamily: 'sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>🔑 Googleでログイン</button>
          )}
        </div>
      )}

      {showMyPage && user && (
        <MyPage user={user} onClose={() => setShowMyPage(false)} />
      )}
    </div>
  )
}

export default AppPC
