// src/pages/MyPage.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// メーカーリスト
const MAKERS = [
  'Honda', 'Yamaha', 'Kawasaki', 'Suzuki',
  'BMW', 'Ducati', 'Triumph', 'Harley-Davidson',
  'KTM', 'Royal Enfield', 'Aprilia', 'Moto Guzzi',
  'Indian', 'Zero Motorcycles',
  'その他',
]

// bike_model 文字列をメーカー・カスタムメーカー・車種名に分解する関数
function parseBikeModel(bikeModel) {
  if (!bikeModel) return { maker: '', customMaker: '', modelName: '' }

  const parts = bikeModel.split(' ')
  const firstWord = parts[0]
  const rest = parts.slice(1).join(' ')

  // メーカーリストに一致する場合
  if (MAKERS.includes(firstWord) && firstWord !== 'その他') {
    return { maker: firstWord, customMaker: '', modelName: rest }
  }

  // 一致しない場合は「その他」にしてメーカー名欄へ
  return { maker: 'その他', customMaker: firstWord, modelName: rest }
}

function MyPage({ user, onClose }) {
  const [username, setUsername] = useState('')
  const [maker, setMaker] = useState('')           // ★ 追加：メーカー選択
  const [customMaker, setCustomMaker] = useState('') // ★ 追加：その他のメーカー名
  const [modelName, setModelName] = useState('')   // ★ 追加：車種名
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [iconHover, setIconHover] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (!error && data) {
        setUsername(data.username || '')
        setBio(data.bio || '')
        setAvatarUrl(data.avatar_url || null)

        // ★ 追加：bike_model をメーカー・車種名に分解してセット
        const parsed = parseBikeModel(data.bike_model || '')
        setMaker(parsed.maker)
        setCustomMaker(parsed.customMaker)
        setModelName(parsed.modelName)
      }
      setLoading(false)
    }
    loadProfile()
  }, [user])

  async function saveProfile() {
    setSaving(true)
    setSaved(false)

    // ★ 追加：メーカー＋車種名を結合して bike_model を生成
    const makerPart = maker === 'その他' ? customMaker : maker
    const bikeModel = [makerPart, modelName].filter(Boolean).join(' ')

    const { error } = await supabase
      .from('profiles')
      .update({ username, bike_model: bikeModel, bio })
      .eq('id', user.id)
    setSaving(false)
    if (error) { alert('保存に失敗しました。'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `${user.id}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      alert('アップロードに失敗しました。')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      alert('プロフィールの更新に失敗しました。')
      setUploading(false)
      return
    }

    setAvatarUrl(publicUrl)
    setUploading(false)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.7)',
      zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '20px', padding: '32px',
        width: '360px', color: 'white', position: 'relative',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'transparent', border: 'none',
          color: '#888', fontSize: '20px', cursor: 'pointer',
        }}>✕</button>

        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>
          🏍️ マイページ
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>
          {user.email}
        </div>

        {/* アイコン画像エリア */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onMouseEnter={() => setIconHover(true)}
            onMouseLeave={() => setIconHover(false)}
            style={{
              width: '80px', height: '80px',
              borderRadius: '50%',
              background: '#333',
              border: '2px solid rgba(255,255,255,0.15)',
              cursor: uploading ? 'wait' : 'pointer',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="アイコン"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '32px' }}>🏍️</span>
            )}
            {(iconHover || uploading) && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%',
                fontSize: '10px', color: 'white', textAlign: 'center',
                lineHeight: '1.4', padding: '4px',
              }}>
                {uploading ? 'アップロード中...' : '📷 タップして変更'}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>読み込み中...</div>
        ) : (
          <>
            {/* ライダー名 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>ライダー名</label>
              <input type="text" placeholder="例：カイリ" value={username}
                onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
            </div>

            {/* ★ 変更：バイク車種を2段階に */}
            {/* メーカー選択ドロップダウン */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>メーカー</label>
              <select
                value={maker}
                onChange={(e) => setMaker(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="" disabled style={{ background: '#1a1a1a' }}>選択してください</option>
                {MAKERS.map((m) => (
                  <option key={m} value={m} style={{ background: '#1a1a1a' }}>{m}</option>
                ))}
              </select>
            </div>

            {/* その他を選んだ場合のみメーカー名入力欄を表示 */}
            {maker === 'その他' && (
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>メーカー名</label>
                <input type="text" placeholder="例：Bimota" value={customMaker}
                  onChange={(e) => setCustomMaker(e.target.value)} style={inputStyle} />
              </div>
            )}

            {/* 車種名テキスト入力 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>車種名</label>
              <input type="text" placeholder="例：CB400SF" value={modelName}
                onChange={(e) => setModelName(e.target.value)} style={inputStyle} />
            </div>

            {/* 一言自己紹介 */}
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
