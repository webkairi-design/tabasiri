// src/pages/MyPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function MyPage({ user, onClose }) {
  const [username, setUsername] = useState('')
  const [bikeModel, setBikeModel] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!error && data) {
        setUsername(data.username || '')
        setBikeModel(data.bike_model || '')
        setBio(data.bio || '')
      }
      setLoading(false)
    }
    loadProfile()
  }, [user])

  async function saveProfile() {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('profiles')
      .update({ username, bike_model: bikeModel, bio })
      .eq('id', user.id)
    setSaving(false)
    if (error) { alert('保存に失敗しました。'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.7)',
      zIndex: 3000, // ← 投稿パネル(1000)より高く設定
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '20px', padding: '32px',
        width: '360px', color: 'white', position: 'relative',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'transparent', border: 'none',
          color: '#888', fontSize: '20px', cursor: 'pointer',
        }}>✕</button>

        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>
          🏍️ マイページ
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '24px' }}>
          {user.email}
        </div>

        {loading ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>読み込み中...</div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>ライダー名</label>
              <input type="text" placeholder="例：カイリ" value={username}
                onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>バイク車種</label>
              <input type="text" placeholder="例：CB400SF" value={bikeModel}
                onChange={(e) => setBikeModel(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>一言自己紹介</label>
              <textarea placeholder="例：週末ライダーです。" value={bio}
                onChange={(e) => setBio(e.target.value)} rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} />
            </div>
            <button onClick={saveProfile} disabled={saving} style={{
              width: '100%', padding: '12px', borderRadius: '10px',
              border: 'none', background: saved ? '#00C853' : '#FF4500',
              color: 'white', fontSize: '15px', fontWeight: 'bold',
              cursor: saving ? 'wait' : 'pointer', transition: 'background 0.3s',
            }}>
              {saving ? '保存中...' : saved ? '✅ 保存しました！' : '保存する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: 'white', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
}

export default MyPage