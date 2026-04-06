// src/constants.js

export const PIN_COLORS = {
  now:     '#FF4500',
  visited: '#00C853',
  want:    '#2979FF',
}

export const PIN_TYPES = [
  { key: 'now',     label: '📍 今ここ',   desc: '24時間で自動消滅' },
  { key: 'visited', label: '✅ 訪問済み', desc: 'ずっと残る'       },
  { key: 'want',    label: '⭐ 行きたい', desc: 'ずっと残る'       },
]

export const CATEGORIES = [
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