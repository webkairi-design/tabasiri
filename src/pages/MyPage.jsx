// src/pages/MapPage.jsx
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const PIN_COLORS = {
  now:     '#FF4500',
  visited: '#00C853',
  want:    '#2979FF',
}

const PIN_TYPES = [
  { key: 'now',     label: '📍 今ここ',   desc: '24時間で自動消滅' },
  { key: 'visited', label: '✅ 訪問済み', desc: 'ずっと残る'       },
  { key: 'want',    label: '⭐ 行きたい', desc: 'ずっと残る'       },
]

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

function createColorPin(color, emoji = '') {
  return L.divIcon({
    className: '',
    html: emoji
      ? `<div style="width:28px;height:28px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;">${emoji}</div>`
      : `<div style="width:16px;height:16px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 0 6px rgba(0,0,0,0.5);"></div>`,
    iconSize: emoji ? [28, 28] : [16, 16],
    iconAnchor: emoji ? [14, 14] : [8, 8],
  })
}

function MapPage({ user, activeFilter }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const userRef = useRef(user) // ← userをrefで管理（クリックイベント内で最新のuserを参照するため）

  const [posting, setPosting] = useState(false)
  const [clickedLatLng, setClickedLatLng] = useState(null)
  const [comment, setComment] = useState('')
  const [pinType, setPinType] = useState('now')
  const [category, setCategory] = useState('other')

  const [riderCard, setRiderCard] = useState(null)
  const [riderProfile, setRiderProfile] = useState(null)

  // userが変わるたびにrefを更新
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, { center: [36.5, 137.0], zoom: 6 })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map)

    // クリックイベントはuserRefを参照（常に最新のuserを取得できる）
    map.on('click', (e) => {
      if (!userRef.current) return
      setRiderCard(null)
      setRiderProfile(null)
      setClickedLatLng(e.latlng)
      setComment('')
      setPinType('now')
      setCategory('other')
    })

    mapInstanceRef.current = map
    loadPins(map)
  }, []) // ← 依存配列を空に。マップは一度だけ初期化

  useEffect(() => {
    if (!mapInstanceRef.current) return
    markersRef.current.forEach(({ marker, pin }) => {
      if (activeFilter === null || pin.category === activeFilter) {
        marker.addTo(mapInstanceRef.current)
      } else {
        marker.remove()
      }
    })
  }, [activeFilter])

  async function loadPins(map) {
    const now = new Date().toISOString()
    const { data: pins, error } = await supabase
      .from('pins').select('*').or(`expires_at.is.null,expires_at.gt.${now}`)
    if (error) { console.error('ピン取得エラー:', error); return }
    pins.forEach((pin) => addPinToMap(map, pin))
  }

  function addPinToMap(map, pin) {
    const color = PIN_COLORS[pin.type] || '#888888'
    const cat = CATEGORIES.find(c => c.key === pin.category)
    const icon = createColorPin(color, cat ? cat.emoji : '')
    const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map)
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      setClickedLatLng(null)
      openRiderCard(pin)
    })
    markersRef.current.push({ marker, pin })
  }

  async function openRiderCard(pin) {
    setRiderCard(pin); setRiderProfile(null)
    const { data: profile, error } = await supabase
      .from('profiles').select('*').eq('id', pin.user_id).single()
    if (error) { setRiderProfile({}); return }
    setRiderProfile(profile)
  }

  async function postPin() {
    if (!clickedLatLng || !userRef.current) return
    setPosting(true)
    let expiresAt = null
    if (pinType === 'now') {
      const expires = new Date()
      expires.setHours(expires.getHours() + 24)
      expiresAt = expires.toISOString()
    }
    const { data, error } = await supabase.from('pins').insert({
      user_id: userRef.current.id,
      lat: clickedLatLng.lat, lng: clickedLatLng.lng,
      type: pinType, comment, category, expires_at: expiresAt,
    }).select().single()
    if (error) { console.error('投稿エラー:', error); setPosting(false); return }
    addPinToMap(mapInstanceRef.current, data)
    setClickedLatLng(null); setComment(''); setPosting(false)
  }

  const currentColor = PIN_COLORS[pinType]
  const cardType = riderCard ? PIN_TYPES.find(t => t.key === riderCard.type) : null
  const cardColor = riderCard ? (PIN_COLORS[riderCard.type] || '#888') : '#888'
  const cardCat = riderCard ? CATEGORIES.find(c => c.key === riderCard.category) : null

  return (
    <>
      <div ref={mapRef} style={{ width: '100vw', height: '100vh' }} />

      {/* ── ライダーカード ── */}
      {riderCard && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', border: `1px solid ${cardColor}44`,
          borderRadius: '16px', padding: '20px 24px',
          zIndex: 1000, width: '320px', fontFamily: 'sans-serif', color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <button onClick={() => { setRiderCard(null); setRiderProfile(null) }}
            style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' }}
          >✕</button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: riderProfile === null ? 'rgba(255,255,255,0.1)' : cardColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, border: `2px solid ${cardColor}` }}>
              {riderProfile !== null && '🏍️'}
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
          {riderCard.comment && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#ddd', lineHeight: '1.5' }}>
              💬 {riderCard.comment}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#555', marginTop: '10px', textAlign: 'right' }}>
            {riderCard.lat.toFixed(4)}, {riderCard.lng.toFixed(4)}
          </div>
        </div>
      )}

      {/* ── 投稿パネル ── */}
      {clickedLatLng && (
        <div style={{
          position: 'fixed', bottom: '0', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px 16px 0 0', padding: '16px 24px 32px',
          zIndex: 1000, width: '360px', fontFamily: 'sans-serif', color: 'white',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          maxHeight: '85vh', overflowY: 'auto',
        }}>
          <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>ピンの種類</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {PIN_TYPES.map((type) => {
                const isSelected = pinType === type.key
                return (
                  <button key={type.key} onClick={() => setPinType(type.key)} style={{
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

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>カテゴリ</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.key
                return (
                  <button key={cat.key} onClick={() => setCategory(cat.key)} style={{
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

          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            {clickedLatLng.lat.toFixed(4)}, {clickedLatLng.lng.toFixed(4)}
          </div>

          <input type="text" placeholder="一言コメント（任意）" value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
              color: 'white', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setClickedLatLng(null)} style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
              color: 'white', cursor: 'pointer', fontSize: '14px',
            }}>キャンセル</button>
            <button onClick={postPin} disabled={posting} style={{
              flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
              background: currentColor, color: 'white', cursor: 'pointer',
              fontSize: '14px', fontWeight: 'bold',
            }}>{posting ? '投稿中...' : '投稿する'}</button>
          </div>
        </div>
      )}

      {!user && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)', color: '#aaa',
          padding: '10px 20px', borderRadius: '20px',
          fontSize: '13px', fontFamily: 'sans-serif', zIndex: 1000,
        }}>ログインするとピンを投稿できます</div>
      )}
    </>
  )
}

export default MapPage