// src/pages/MapPage.jsx
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { supabase } from '../lib/supabase'
import { CATEGORIES, PIN_TYPES, PIN_COLORS } from '../constants'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

function MapPage({ user, activeFilter, onMapReady }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const clusterGroupRef = useRef(null)
  const userRef = useRef(user)
  const fileInputRefs = [useRef(null), useRef(null)]

  const [posting, setPosting] = useState(false)
  const [clickedLatLng, setClickedLatLng] = useState(null)
  const [comment, setComment] = useState('')
  const [pinType, setPinType] = useState('now')
  const [category, setCategory] = useState('other')
  const [selectedImages, setSelectedImages] = useState([null, null])

  const [riderCard, setRiderCard] = useState(null)
  const [riderProfile, setRiderProfile] = useState(null)

  // ★ 追加：写真モーダル用 state
  const [photoModal, setPhotoModal] = useState(null)  // { urls: string[], index: number } | null

  // ★ 追加：24時間後に訪問済みへ変換するかどうか
  const [convertToVisited, setConvertToVisited] = useState(false)

  // ★ 追加：投稿パネルのステップ（1 or 2）
  const [step, setStep] = useState(1)

  // ★ 追加：GPS・住所検索用 state
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, { center: [36.5, 137.0], zoom: 6 })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map)

    const clusterGroup = L.markerClusterGroup({
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
    })
    clusterGroup.addTo(map)
    clusterGroupRef.current = clusterGroup

    map.on('click', (e) => {
      if (!userRef.current) return
      setRiderCard(null)
      setRiderProfile(null)
      setClickedLatLng(e.latlng)
      setComment('')
      setPinType('now')
      setCategory('other')
      setSelectedImages([null, null])
      setConvertToVisited(false) // ★ 追加：リセット
      setStep(1)                 // ★ 追加：ステップリセット
    })

    mapInstanceRef.current = map
    loadPins(map)

    if (onMapReady) onMapReady(map)
  }, [])

  useEffect(() => {
    if (!clusterGroupRef.current) return
    markersRef.current.forEach(({ marker, pin }) => {
      if (activeFilter === null || pin.category === activeFilter) {
        clusterGroupRef.current.addLayer(marker)
      } else {
        clusterGroupRef.current.removeLayer(marker)
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
    const marker = L.marker([pin.lat, pin.lng], { icon })
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      setClickedLatLng(null)
      openRiderCard(pin)
    })
    clusterGroupRef.current.addLayer(marker)
    markersRef.current.push({ marker, pin })
  }

  async function openRiderCard(pin) {
    setRiderCard(pin); setRiderProfile(null)
    const { data: profile, error } = await supabase
      .from('profiles').select('*').eq('id', pin.user_id).single()
    if (error) { setRiderProfile({}); return }
    setRiderProfile(profile)
  }

  function handleImageSelect(index, e) {
    const file = e.target.files?.[0]
    if (!file) return
    const updated = [...selectedImages]
    updated[index] = file
    setSelectedImages(updated)
  }

  function handleImageRemove(index) {
    const updated = [...selectedImages]
    updated[index] = null
    setSelectedImages(updated)
    if (fileInputRefs[index].current) fileInputRefs[index].current.value = ''
  }

  async function uploadImages(userId) {
    const urls = []
    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i]
      if (!file) continue
      const ext = file.name.split('.').pop()
      const fileName = `${userId}_${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage
        .from('pin-images')
        .upload(fileName, file, { upsert: true })
      if (error) { console.error('画像アップロードエラー:', error); continue }
      const { data: urlData } = supabase.storage
        .from('pin-images')
        .getPublicUrl(fileName)
      urls.push(urlData.publicUrl)
    }
    return urls.length > 0 ? urls : null
  }

  async function postPin() {
    if (!clickedLatLng || !userRef.current) return
    setPosting(true)

    const imageUrls = await uploadImages(userRef.current.id)

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
      image_urls: imageUrls,
      convert_to_visited: convertToVisited, // ★ 追加
    }).select().single()
    if (error) { console.error('投稿エラー:', error); setPosting(false); return }
    addPinToMap(mapInstanceRef.current, data)
    setClickedLatLng(null); setComment(''); setSelectedImages([null, null]); setConvertToVisited(false); setStep(1); setPosting(false)
  }

  async function deletePin() {
    if (!riderCard) return
    const ok = window.confirm('本当に削除しますか？')
    if (!ok) return

    const { error } = await supabase
      .from('pins')
      .delete()
      .eq('id', riderCard.id)

    if (error) { console.error('削除エラー:', error); return }

    markersRef.current = markersRef.current.filter(({ marker, pin }) => {
      if (pin.id === riderCard.id) {
        clusterGroupRef.current.removeLayer(marker)
        return false
      }
      return true
    })

    setRiderCard(null)
    setRiderProfile(null)
  }

  // ★ 追加：GPS現在地取得
  function handleGps() {
    if (!userRef.current) return
    if (!navigator.geolocation) {
      setGpsError('このブラウザはGPSに対応していません')
      return
    }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapInstanceRef.current?.flyTo([latlng.lat, latlng.lng], 15)
        setRiderCard(null)
        setRiderProfile(null)
        setClickedLatLng(latlng)
        setComment('')
        setPinType('now')
        setCategory('other')
        setSelectedImages([null, null])
        setConvertToVisited(false)
        setStep(1)
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) setGpsError('位置情報の許可が必要です')
        else if (err.code === 2) setGpsError('現在地を取得できませんでした')
        else setGpsError('タイムアウトしました。再度お試しください')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ★ 追加：住所検索（Photon API）
  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    if (!userRef.current) return
    setSearchLoading(true)
    setSearchError('')
    try {
      const encoded = encodeURIComponent(searchQuery.trim())
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encoded}&limit=1&lang=ja`
      )
      const results = await res.json()
      if (!results || !results.features || results.features.length === 0) {
        setSearchError('見つかりませんでした。別の地名をお試しください')
        setSearchLoading(false)
        return
      }
      const [lng, lat] = results.features[0].geometry.coordinates
      const latlng = { lat, lng }
      mapInstanceRef.current?.flyTo([latlng.lat, latlng.lng], 15)
      setRiderCard(null)
      setRiderProfile(null)
      setClickedLatLng(latlng)
      setComment('')
      setPinType('now')
      setCategory('other')
      setSelectedImages([null, null])
      setConvertToVisited(false)
      setStep(1)
      setSearchQuery('')
    } catch {
      setSearchError('通信エラーが発生しました')
    }
    setSearchLoading(false)
  }

  const currentColor = PIN_COLORS[pinType]
  const cardType = riderCard ? PIN_TYPES.find(t => t.key === riderCard.type) : null
  const cardColor = riderCard ? (PIN_COLORS[riderCard.type] || '#888') : '#888'
  const cardCat = riderCard ? CATEGORIES.find(c => c.key === riderCard.category) : null
  const isMyPin = riderCard && user && riderCard.user_id === user.id

  return (
    <>
      <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />

      {/* ★ 追加：GPS・住所検索UI（右上ズームボタンの下） */}
      <div style={{
        position: 'fixed',
        top: '126px', // Leafletのズームボタン（高さ約110px）の下
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontFamily: 'sans-serif',
      }}>
        {/* GPSボタン */}
        <button
          onClick={handleGps}
          disabled={gpsLoading || !user}
          title={user ? '現在地に移動して投稿パネルを開く' : 'ログインが必要です'}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '4px',
            border: '2px solid rgba(0,0,0,0.2)',
            background: 'white',
            color: gpsLoading ? '#aaa' : '#333',
            fontSize: '16px',
            cursor: user ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
          }}
        >
          {gpsLoading ? '…' : '📍'}
        </button>

        {/* 住所検索フォーム */}
        <form
          onSubmit={handleSearch}
          style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
        >
          <div style={{ display: 'flex', gap: '0' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchError('') }}
              placeholder="地名・住所を検索"
              disabled={!user}
              style={{
                width: '160px',
                height: '34px',
                padding: '0 8px',
                borderRadius: '4px 0 0 4px',
                border: '2px solid rgba(0,0,0,0.2)',
                borderRight: 'none',
                background: 'white',
                color: '#111',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
              }}
            />
            <button
              type="submit"
              disabled={searchLoading || !user}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '0 4px 4px 0',
                border: '2px solid rgba(0,0,0,0.2)',
                background: 'white',
                color: searchLoading ? '#aaa' : '#333',
                fontSize: '14px',
                cursor: user ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
                flexShrink: 0,
              }}
            >
              {searchLoading ? '…' : '🔍'}
            </button>
          </div>

          {/* エラーメッセージ（GPS / 住所検索） */}
          {(gpsError || searchError) && (
            <div style={{
              background: 'rgba(20,20,20,0.9)',
              color: '#ff6b6b',
              fontSize: '11px',
              padding: '6px 8px',
              borderRadius: '6px',
              maxWidth: '194px',
              lineHeight: '1.4',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              {gpsError || searchError}
            </div>
          )}
        </form>
      </div>

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
          {riderCard.comment && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#ddd', lineHeight: '1.5' }}>
              💬 {riderCard.comment}
            </div>
          )}

          {/* ★ 変更：<a>タグ → クリックでモーダルを開く */}
          {riderCard.image_urls && riderCard.image_urls.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {riderCard.image_urls.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setPhotoModal({ urls: riderCard.image_urls, index: i })}
                  style={{ flex: 1, height: '120px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}
                >
                  <img src={url} alt={`写真${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#555', marginTop: '10px', textAlign: 'right' }}>
            {riderCard.lat.toFixed(4)}, {riderCard.lng.toFixed(4)}
          </div>
          {isMyPin && (
            <button onClick={deletePin} style={{
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
      )}

      {/* ★ 写真モーダル */}
      {photoModal && (
        // 背景（クリックで閉じる）
        <div
          onClick={() => setPhotoModal(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          {/* 中央コンテンツ（クリックが背景に伝わらないよう stopPropagation） */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }}
          >
            {/* 写真 */}
            <img
              src={photoModal.urls[photoModal.index]}
              alt={`写真${photoModal.index + 1}`}
              style={{
                maxWidth: '90vw', maxHeight: '80vh',
                borderRadius: '12px', display: 'block',
                objectFit: 'contain',
              }}
            />

            {/* ✕ 閉じるボタン */}
            <button
              onClick={() => setPhotoModal(null)}
              style={{
                position: 'absolute', top: '-14px', right: '-14px',
                width: '32px', height: '32px',
                borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.15)',
                color: 'white', fontSize: '16px',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>

            {/* 左矢印ボタン（1枚目は非表示） */}
            {photoModal.urls.length > 1 && photoModal.index > 0 && (
              <button
                onClick={() => setPhotoModal(m => ({ ...m, index: m.index - 1 }))}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                style={{
                  position: 'absolute', left: '8px', top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px', height: '48px',
                  borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white', fontSize: '24px',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >‹</button>
            )}

            {/* 右矢印ボタン（最後の枚は非表示） */}
            {photoModal.urls.length > 1 && photoModal.index < photoModal.urls.length - 1 && (
              <button
                onClick={() => setPhotoModal(m => ({ ...m, index: m.index + 1 }))}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                style={{
                  position: 'absolute', right: '8px', top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px', height: '48px',
                  borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white', fontSize: '24px',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >›</button>
            )}

            {/* 枚数カウンター（画像下部中央・14px） */}
            {photoModal.urls.length > 1 && (
              <div style={{
                position: 'absolute', bottom: '-32px', left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.7)', fontSize: '14px',
                whiteSpace: 'nowrap',
              }}>
                {photoModal.index + 1} / {photoModal.urls.length}
              </div>
            )}
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
                      <button key={type.key} onClick={() => {
                        setPinType(type.key)
                        if (type.key !== 'now') setConvertToVisited(false)
                      }} style={{
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
                    onClick={() => setConvertToVisited(false)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: '8px',
                      border: !convertToVisited ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.15)',
                      background: !convertToVisited ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: 'white', cursor: 'pointer', fontSize: '11px', textAlign: 'center', lineHeight: '1.4',
                    }}
                  >そのまま消える</button>
                  <button
                    onClick={() => setConvertToVisited(true)}
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
                <button onClick={() => setClickedLatLng(null)} style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                  color: 'white', cursor: 'pointer', fontSize: '14px',
                }}>キャンセル</button>
                <button onClick={() => setStep(2)} style={{
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

              <input type="text" placeholder="一言コメント（任意）" value={comment}
                onChange={(e) => setComment(e.target.value)}
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
                          onChange={(e) => handleImageSelect(index, e)}
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
                            onClick={() => handleImageRemove(index)}
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
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                  color: 'white', cursor: 'pointer', fontSize: '14px',
                }}>← 戻る</button>
                <button onClick={postPin} disabled={posting} style={{
                  flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                  background: currentColor, color: 'white', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 'bold',
                }}>{posting ? '投稿中...' : '投稿する'}</button>
              </div>
            </>
          )}
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
