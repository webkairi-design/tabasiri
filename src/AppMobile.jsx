// src/AppMobile.jsx
import { useState } from 'react'
import MapPage from './pages/MapPage'
import MyPage from './pages/MyPage'

const CATEGORIES = [
  { key: 'michinoeki', label: '道の駅',   emoji: '🏪' },
  { key: 'tenbodai',   label: '展望台',   emoji: '🗻' },
  { key: 'onsen',      label: '温泉',     emoji: '♨️' },
  { key: 'umi',        label: '海岸・湖', emoji: '🌊' },
  { key: 'toge',       label: '峠・山道', emoji: '⛰️' },
  { key: 'gourmet',    label: 'グルメ',   emoji: '🍜' },
  { key: 'jinja',      label: '神社・寺', emoji: '⛩️' },
  { key: 'kanko',      label: '観光地',   emoji: '📸' },
  { key: 'other',      label: 'その他',   emoji: '📍' },
]

function AppMobile({ user, loading, signInWithGoogle, signOut }) {
  const [showMyPage, setShowMyPage] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null)

  return (
    <div style={{ position: 'relative' }}>
      <MapPage user={user} activeFilter={activeFilter} />

      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0,
          width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'sans-serif', zIndex: 500,
        }}>読み込み中...</div>
      )}

      {/* 右上ボタン（1行目）*/}
      {!loading && (
        <div style={{
          position: 'fixed', top: '12px', right: '12px', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {user ? (
            <>
              <button onClick={() => setShowMyPage(true)} style={{
                padding: '8px 12px', background: 'rgba(255,69,0,0.9)',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif',
                fontWeight: 'bold',
              }}>🏍️</button>
              <button onClick={signOut} style={{
                padding: '8px 12px', background: 'rgba(0,0,0,0.7)',
                color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontFamily: 'sans-serif',
              }}>ログアウト</button>
            </>
          ) : (
            <button onClick={signInWithGoogle} style={{
              padding: '8px 16px', background: 'white', color: '#111',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 'bold',
              fontFamily: 'sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>🔑 ログイン</button>
          )}
        </div>
      )}

      {/* フィルターバー（2行目・右上ボタンの下）*/}
      <div style={{
        position: 'fixed',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '6px',
        background: 'rgba(20,20,20,0.85)',
        backdropFilter: 'blur(8px)',
        padding: '8px 12px',
        borderRadius: '40px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        maxWidth: 'calc(100vw - 24px)',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
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

      {showMyPage && user && (
        <MyPage user={user} onClose={() => setShowMyPage(false)} />
      )}
    </div>
  )
}

export default AppMobile