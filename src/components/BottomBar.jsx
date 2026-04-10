// src/components/BottomBar.jsx
// props:
//   user           : ログイン中ユーザー（null = 未ログイン）
//   gpsLoading     : boolean  GPS取得中
//   gpsError       : string   GPSエラーメッセージ
//   searchQuery    : string   住所検索テキスト
//   searchLoading  : boolean  検索中
//   searchError    : string   検索エラーメッセージ
//   searchExpanded : boolean  検索欄の展開状態
//   searchInputRef : ref      input要素への参照
//   gpsLatLng      : { lat, lng } | null  GPS取得済み座標
//   onGps          : () => void
//   onSearchChange : (value: string) => void
//   onSearchSubmit : (e) => void
//   onSearchToggle : () => void  検索ボタン押下（展開切り替え）
//   onOpenNearby   : () => void
import { useRef } from 'react'

function BottomBar({
  user,
  gpsLoading,
  gpsError,
  searchQuery,
  searchLoading,
  searchError,
  searchExpanded,
  searchInputRef,
  gpsLatLng,
  onGps,
  onSearchChange,
  onSearchSubmit,
  onSearchToggle,
  onOpenNearby,
}) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      fontFamily: 'sans-serif',
    }}>
      {/* エラートースト（GPS / 住所検索） */}
      {(gpsError || searchError) && (
        <div style={{
          background: 'rgba(20,20,20,0.92)',
          color: '#ff6b6b',
          fontSize: '12px',
          padding: '7px 14px',
          borderRadius: '20px',
          lineHeight: '1.4',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}>
          {gpsError || searchError}
        </div>
      )}

      {/* 検索欄（searchExpanded のときだけ表示） */}
      {searchExpanded && (
        <form
          onSubmit={onSearchSubmit}
          style={{ display: 'flex', gap: '0' }}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') onSearchToggle() }}
            placeholder="地名・施設名を入力して Enter"
            autoFocus
            style={{
              width: '240px',
              height: '40px',
              padding: '0 12px',
              borderRadius: '20px 0 0 20px',
              border: '1.5px solid rgba(255,255,255,0.2)',
              borderRight: 'none',
              background: 'rgba(20,20,20,0.92)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}
          />
          <button
            type="submit"
            disabled={searchLoading}
            style={{
              width: '44px',
              height: '40px',
              borderRadius: '0 20px 20px 0',
              border: '1.5px solid rgba(255,255,255,0.2)',
              background: 'rgba(20,20,20,0.92)',
              backdropFilter: 'blur(10px)',
              color: searchLoading ? '#666' : 'white',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              flexShrink: 0,
            }}
          >
            {searchLoading ? '…' : '🔍'}
          </button>
        </form>
      )}

      {/* メインバー：3ボタン横並び */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        background: 'rgba(20,20,20,0.88)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '40px',
        padding: '6px 8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
      }}>

        {/* ① 現在地ボタン */}
        <button
          onClick={onGps}
          disabled={gpsLoading || !user}
          title={user ? '現在地を取得' : 'ログインが必要です'}
          style={{
            height: '38px',
            padding: '0 16px',
            borderRadius: '30px',
            border: 'none',
            background: gpsLoading ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
            color: (!user || gpsLoading) ? '#555' : 'white',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: (!user || gpsLoading) ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (user && !gpsLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = gpsLoading ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)' }}
        >
          {gpsLoading ? '取得中…' : '📍 現在地'}
        </button>

        {/* セパレーター */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

        {/* ② 場所を検索ボタン（タップで入力欄展開） */}
        <button
          onClick={onSearchToggle}
          disabled={!user}
          title={user ? '場所・施設名を検索' : 'ログインが必要です'}
          style={{
            height: '38px',
            padding: '0 16px',
            borderRadius: '30px',
            border: 'none',
            background: searchExpanded ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)',
            color: !user ? '#555' : 'white',
            fontSize: '13px',
            fontWeight: searchExpanded ? 'bold' : 'normal',
            cursor: !user ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (user) e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = searchExpanded ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)' }}
        >
          🔍 {searchExpanded ? '閉じる' : '場所を検索'}
        </button>

        {/* セパレーター */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

        {/* ③ 周辺を見るボタン（GPS未取得時はグレーアウト） */}
        <button
          onClick={onOpenNearby}
          disabled={!gpsLatLng}
          title={gpsLatLng ? '現在地周辺のピンを一覧表示' : '先に現在地を取得してください'}
          style={{
            height: '38px',
            padding: '0 16px',
            borderRadius: '30px',
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: gpsLatLng ? 'white' : '#555',
            fontSize: '13px',
            fontWeight: 'normal',
            cursor: gpsLatLng ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (gpsLatLng) e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
        >
          📡 周辺を見る
        </button>
      </div>
    </div>
  )
}

export default BottomBar
