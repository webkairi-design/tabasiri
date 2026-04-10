// src/pages/MapPage.jsx
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { supabase } from '../lib/supabase'
import { CATEGORIES, PIN_COLORS } from '../constants'
import PostPanel   from '../components/PostPanel'
import RiderCard   from '../components/RiderCard'
import NearbyPanel from '../components/NearbyPanel'
import PhotoModal  from '../components/PhotoModal'
import BottomBar   from '../components/BottomBar'

// ── Leaflet デフォルトアイコン修正 ──
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

// Haversine公式（2点間の距離をkmで返す）
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function MapPage({ user, activeFilter, onMapReady }) {
  // ── 地図関連 ref ──
  const mapRef          = useRef(null)
  const mapInstanceRef  = useRef(null)
  const markersRef      = useRef([])
  const clusterGroupRef = useRef(null)
  const userRef         = useRef(user)

  // ── 投稿パネル用 ref ──
  const fileInputRefs = [useRef(null), useRef(null)]

  // ── 投稿パネル state ──
  const [posting, setPosting]                   = useState(false)
  const [clickedLatLng, setClickedLatLng]       = useState(null)
  const [comment, setComment]                   = useState('')
  const [pinType, setPinType]                   = useState('now')
  const [category, setCategory]                 = useState('other')
  const [selectedImages, setSelectedImages]     = useState([null, null])
  const [convertToVisited, setConvertToVisited] = useState(false)
  const [step, setStep]                         = useState(1)

  // ── ライダーカード state ──
  const [riderCard, setRiderCard]       = useState(null)
  const [riderProfile, setRiderProfile] = useState(null)

  // ── 写真モーダル state ──
  const [photoModal, setPhotoModal] = useState(null)

  // ── GPS・住所検索 state ──
  const [gpsLoading, setGpsLoading]         = useState(false)
  const [gpsError, setGpsError]             = useState('')
  const [searchQuery, setSearchQuery]       = useState('')
  const [searchLoading, setSearchLoading]   = useState(false)
  const [searchError, setSearchError]       = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const searchInputRef                      = useRef(null)

  // ── 周辺ピン一覧パネル state ──
  const [gpsLatLng, setGpsLatLng]             = useState(null)
  const [nearbyPanelOpen, setNearbyPanelOpen] = useState(false)
  const [nearbyRadius, setNearbyRadius]       = useState(10)
  const [nearbyPins, setNearbyPins]           = useState([])

  // user が変わったら ref に反映
  useEffect(() => { userRef.current = user }, [user])

  // 地図初期化（マウント時1回だけ）
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
      setRiderCard(null); setRiderProfile(null)
      setClickedLatLng(e.latlng); setComment('')
      setPinType('now'); setCategory('other')
      setSelectedImages([null, null]); setConvertToVisited(false); setStep(1)
    })

    mapInstanceRef.current = map
    loadPins(map)
    if (onMapReady) onMapReady(map)
  }, [])

  // カテゴリフィルター切り替え
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

  // nearbyRadius が変わったとき、パネルが開いていれば再計算
  useEffect(() => {
    if (nearbyPanelOpen && gpsLatLng) calcNearbyPins(gpsLatLng, nearbyRadius)
  }, [nearbyRadius])

  // ────────────────────────────────────────
  // 地図・ピン操作
  // ────────────────────────────────────────

  async function loadPins(map) {
    const now = new Date().toISOString()
    const { data: pins, error } = await supabase
      .from('pins').select('*').or(`expires_at.is.null,expires_at.gt.${now}`)
    if (error) { console.error('ピン取得エラー:', error); return }
    pins.forEach((pin) => addPinToMap(map, pin))
  }

  function addPinToMap(map, pin) {
    const color  = PIN_COLORS[pin.type] || '#888888'
    const cat    = CATEGORIES.find(c => c.key === pin.category)
    const icon   = createColorPin(color, cat ? cat.emoji : '')
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

  // ────────────────────────────────────────
  // 投稿パネル操作
  // ────────────────────────────────────────

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
      const ext      = file.name.split('.').pop()
      const fileName = `${userId}_${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage
        .from('pin-images').upload(fileName, file, { upsert: true })
      if (error) { console.error('画像アップロードエラー:', error); continue }
      const { data: urlData } = supabase.storage.from('pin-images').getPublicUrl(fileName)
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
      convert_to_visited: convertToVisited,
    }).select().single()
    if (error) { console.error('投稿エラー:', error); setPosting(false); return }
    addPinToMap(mapInstanceRef.current, data)
    setClickedLatLng(null); setComment(''); setSelectedImages([null, null])
    setConvertToVisited(false); setStep(1); setPosting(false)
  }

  // ────────────────────────────────────────
  // ライダーカード操作
  // ────────────────────────────────────────

  async function deletePin() {
    if (!riderCard) return
    const ok = window.confirm('本当に削除しますか？')
    if (!ok) return
    const { error } = await supabase.from('pins').delete().eq('id', riderCard.id)
    if (error) { console.error('削除エラー:', error); return }
    markersRef.current = markersRef.current.filter(({ marker, pin }) => {
      if (pin.id === riderCard.id) {
        clusterGroupRef.current.removeLayer(marker)
        return false
      }
      return true
    })
    setRiderCard(null); setRiderProfile(null)
  }

  // ────────────────────────────────────────
  // GPS・住所検索
  // ────────────────────────────────────────

  function handleGps() {
    if (!userRef.current) return
    if (!navigator.geolocation) { setGpsError('このブラウザはGPSに対応していません'); return }
    setGpsLoading(true); setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        mapInstanceRef.current?.flyTo([latlng.lat, latlng.lng], 15)
        setRiderCard(null); setRiderProfile(null)
        setClickedLatLng(latlng); setComment('')
        setPinType('now'); setCategory('other')
        setSelectedImages([null, null]); setConvertToVisited(false); setStep(1)
        setGpsLoading(false)
        setGpsLatLng(latlng)
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

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    if (!userRef.current) return
    setSearchLoading(true); setSearchError('')
    try {
      const encoded = encodeURIComponent(searchQuery.trim())
      const res     = await fetch(`https://photon.komoot.io/api/?q=${encoded}&limit=1&lang=ja`)
      const results = await res.json()
      if (!results || !results.features || results.features.length === 0) {
        setSearchError('見つかりませんでした。別の地名をお試しください')
        setSearchLoading(false); return
      }
      const [lng, lat] = results.features[0].geometry.coordinates
      const latlng = { lat, lng }
      mapInstanceRef.current?.flyTo([latlng.lat, latlng.lng], 15)
      setRiderCard(null); setRiderProfile(null)
      setClickedLatLng(latlng); setComment('')
      setPinType('now'); setCategory('other')
      setSelectedImages([null, null]); setConvertToVisited(false); setStep(1)
      setSearchQuery('')
    } catch {
      setSearchError('通信エラーが発生しました')
    }
    setSearchLoading(false)
  }

  function handleSearchToggle() {
    if (!userRef.current) return
    const next = !searchExpanded
    setSearchExpanded(next); setSearchError('')
    if (next) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }

  // ────────────────────────────────────────
  // 周辺ピン一覧
  // ────────────────────────────────────────

  function calcNearbyPins(origin, radiusKm) {
    const result = markersRef.current
      .map(({ pin }) => ({
        ...pin,
        distKm: haversineKm(origin.lat, origin.lng, pin.lat, pin.lng),
      }))
      .filter(p => p.distKm <= radiusKm)
      .sort((a, b) => a.distKm - b.distKm)
    setNearbyPins(result)
  }

  function handleOpenNearby() {
    if (!gpsLatLng) return
    calcNearbyPins(gpsLatLng, nearbyRadius)
    setNearbyPanelOpen(true)
  }

  function handleNearbyPinClick(pin) {
    mapInstanceRef.current?.flyTo([pin.lat, pin.lng], 16)
    setNearbyPanelOpen(false); setClickedLatLng(null)
    openRiderCard(pin)
  }

  // ────────────────────────────────────────
  // 描画
  // ────────────────────────────────────────

  const showBottomBar = !clickedLatLng && !riderCard

  return (
    <>
      {/* 地図本体 */}
      <div ref={mapRef} style={{ width: '100%', height: '100vh' }} />

      {/* 下部フローティングバー */}
      {showBottomBar && (
        <BottomBar
          user={user}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
          searchQuery={searchQuery}
          searchLoading={searchLoading}
          searchError={searchError}
          searchExpanded={searchExpanded}
          searchInputRef={searchInputRef}
          gpsLatLng={gpsLatLng}
          onGps={handleGps}
          onSearchChange={(val) => { setSearchQuery(val); setSearchError('') }}
          onSearchSubmit={(e) => { handleSearch(e); setSearchExpanded(false) }}
          onSearchToggle={handleSearchToggle}
          onOpenNearby={handleOpenNearby}
        />
      )}

      {/* 周辺ピン一覧パネル */}
      <NearbyPanel
        nearbyPanelOpen={nearbyPanelOpen}
        nearbyPins={nearbyPins}
        nearbyRadius={nearbyRadius}
        onClose={() => setNearbyPanelOpen(false)}
        onRadiusChange={setNearbyRadius}
        onPinClick={handleNearbyPinClick}
      />

      {/* ライダーカード */}
      <RiderCard
        riderCard={riderCard}
        riderProfile={riderProfile}
        user={user}
        onClose={() => { setRiderCard(null); setRiderProfile(null) }}
        onDelete={deletePin}
        onPhotoClick={(urls, index) => setPhotoModal({ urls, index })}
      />

      {/* 写真モーダル */}
      <PhotoModal
        photoModal={photoModal}
        setPhotoModal={setPhotoModal}
      />

      {/* 投稿パネル */}
      <PostPanel
        clickedLatLng={clickedLatLng}
        step={step}
        pinType={pinType}
        category={category}
        comment={comment}
        convertToVisited={convertToVisited}
        selectedImages={selectedImages}
        posting={posting}
        fileInputRefs={fileInputRefs}
        onCancel={() => setClickedLatLng(null)}
        onNextStep={() => setStep(2)}
        onPrevStep={() => setStep(1)}
        onPinTypeChange={(key) => { setPinType(key); if (key !== 'now') setConvertToVisited(false) }}
        onCategoryChange={setCategory}
        onCommentChange={setComment}
        onConvertChange={setConvertToVisited}
        onImageSelect={handleImageSelect}
        onImageRemove={handleImageRemove}
        onPost={postPin}
      />

      {/* 未ログイン時のヒント */}
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
