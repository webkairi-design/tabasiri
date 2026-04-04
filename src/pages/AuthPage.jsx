// src/pages/AuthPage.jsx
import { useAuth } from '../hooks/useAuth'

function AuthPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#111',
      color: 'white',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>🏍️ Tabashiri</h1>
      <p style={{ color: '#aaa', marginBottom: '32px' }}>ツーリングライダーの地図SNS</p>
      <button
        onClick={signInWithGoogle}
        style={{
          padding: '12px 32px',
          fontSize: '1rem',
          background: 'white',
          color: '#111',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Googleでログイン
      </button>
    </div>
  )
}

export default AuthPage