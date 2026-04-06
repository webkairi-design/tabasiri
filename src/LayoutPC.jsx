// src/LayoutPC.jsx
import { useState } from 'react'
import MapPage from './pages/MapPage'
import MyPage from './pages/MyPage'
import { CATEGORIES } from './constants'

function AppPC({ user, loading, signInWithGoogle, signOut }) {
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

      {/* フィルターバー */}
      <div style={{
        position: 'fixed',
        top: '16px',
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
        maxWidth: 'calc(100vw - 340px)',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
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