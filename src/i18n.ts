import type { Prefecture } from './data/types'

export type Language = 'ja' | 'hira' | 'en'

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'ja', label: '日本語' },
  { value: 'hira', label: 'ひらがな' },
  { value: 'en', label: 'English' },
]

interface Strings {
  title: string
  start: string
  stop: string
  labelsOff: string
  language: string
  complete: string
  allPlaced: string
  playAgain: string
  elapsed: string
}

export const STRINGS: Record<Language, Strings> = {
  ja: {
    title: '日本地図パズル',
    start: 'ゲームスタート',
    stop: 'ストップ',
    labelsOff: 'なし',
    language: '言語',
    complete: 'クリア！',
    allPlaced: '47都道府県がすべて揃いました。',
    playAgain: 'もう一度',
    elapsed: '経過時間',
  },
  hira: {
    title: 'にほんちずぱずる',
    start: 'ゲームすたーと',
    stop: 'ストップ',
    labelsOff: 'なし',
    language: 'ことば',
    complete: 'クリア！',
    allPlaced: '47とどうふけんがぜんぶそろいました。',
    playAgain: 'もういちど',
    elapsed: 'けいかじかん',
  },
  en: {
    title: 'Japan Prefectural Puzzle',
    start: 'Start game',
    stop: 'Stop',
    labelsOff: 'no',
    language: 'Language',
    complete: 'Complete!',
    allPlaced: 'All 47 prefectures are in place.',
    playAgain: 'Play again',
    elapsed: 'Elapsed time',
  },
}

/** Hiragana readings without the administrative suffix (県/府/都), indexed by prefecture id. */
const HIRAGANA: Record<number, string> = {
  1: 'ほっかいどう', 2: 'あおもり', 3: 'いわて', 4: 'みやぎ', 5: 'あきた', 6: 'やまがた',
  7: 'ふくしま', 8: 'いばらき', 9: 'とちぎ', 10: 'ぐんま', 11: 'さいたま', 12: 'ちば',
  13: 'とうきょう', 14: 'かながわ', 15: 'にいがた', 16: 'とやま', 17: 'いしかわ', 18: 'ふくい',
  19: 'やまなし', 20: 'ながの', 21: 'ぎふ', 22: 'しずおか', 23: 'あいち', 24: 'みえ',
  25: 'しが', 26: 'きょうと', 27: 'おおさか', 28: 'ひょうご', 29: 'なら', 30: 'わかやま',
  31: 'とっとり', 32: 'しまね', 33: 'おかやま', 34: 'ひろしま', 35: 'やまぐち', 36: 'とくしま',
  37: 'かがわ', 38: 'えひめ', 39: 'こうち', 40: 'ふくおか', 41: 'さが', 42: 'ながさき',
  43: 'くまもと', 44: 'おおいた', 45: 'みやざき', 46: 'かごしま', 47: 'おきなわ',
}

export function prefectureLabel(p: Prefecture, lang: Language): string {
  if (lang === 'en') return p.name
  if (lang === 'hira') return HIRAGANA[p.id] ?? p.nameJa
  return p.nameJa
}
