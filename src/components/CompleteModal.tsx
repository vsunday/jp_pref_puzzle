import { formatTime } from '../game/puzzle'

interface CompleteModalProps {
  elapsedMs: number
  onPlayAgain: () => void
}

export default function CompleteModal({ elapsedMs, onPlayAgain }: CompleteModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="complete-title">
        <h2 id="complete-title">Complete!</h2>
        <p>All 47 prefectures are in place.</p>
        <p className="modal-time">{formatTime(elapsedMs)}</p>
        <button type="button" className="primary" onClick={onPlayAgain} autoFocus>
          Play again
        </button>
      </div>
    </div>
  )
}
