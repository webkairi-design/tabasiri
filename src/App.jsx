// src/App.jsx
import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import MapPage from './pages/MapPage'
import MyPage from './pages/MyPage'

function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [showMyPage, setShowMyPage] = useState(false) // マイページの表示状態

  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#111',
      color: 'white',
      fontFamily: 'sans-serif',
    }}>
      読み込み中...
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      {/* 地図 */}
      <MapPage user={user} />

      {/* 右上のログインボタン */}
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 1000,
      }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* マイページボタン（追加） */}
            <button
              onClick={() => setShowMyPage(true)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,69,0,0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'sans-serif',
                fontWeight: 'bold',
              }}
            >
              🏍️ マイページ
            </button>
            <span style={{
              color: 'white',
              background: 'rgba(0,0,0,0.6)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'sans-serif',
            }}>
              {user.email}
            </span>
            <button
              onClick={signOut}
              style={{
                padding: '8px 16px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'sans-serif',
              }}
            >
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            style={{
              padding: '8px 20px',
              background: 'white',
              color: '#111',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'sans-serif',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            🔑 Googleでログイン
          </button>
        )}
      </div>

      {/* マイページモーダル（オーバーレイ表示） */}
      {showMyPage && user && (
        <MyPage
          user={user}
          onClose={() => setShowMyPage(false)}
        />
      )}
    </div>
  )
}

export default App