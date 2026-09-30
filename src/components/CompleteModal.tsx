import { STRINGS, type Language } from '../i18n'
import { formatTime } from '../game/puzzle'

interface CompleteModalProps {
  elapsedMs: number
  onPlayAgain: () => void
  language: Language
}

export default function CompleteModal({ elapsedMs, onPlayAgain, language }: CompleteModalProps) {
  const t = STRINGS[language]
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <h2 id="complete-title">{t.complete}</h2>
        <p>{t.allPlaced}</p>
        <p className="modal-time">{formatTime(elapsedMs)}</p>
        <button type="button" className="primary" onClick={onPlayAgain} autoFocus>
          {t.playAgain}
        </button>
      </div>
    </div>
  )
}
