import { useCallback, useEffect, useState } from 'react'
import './App.css'
import Board from './components/Board'
import CompleteModal from './components/CompleteModal'
import { prefectures } from './data/prefectures'
import { formatTime, scatterPieces, type Offsets, type Point } from './game/puzzle'

type Phase = 'idle' | 'playing' | 'complete'

const TOTAL = prefectures.length

function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [offsets, setOffsets] = useState<Offsets>(() => scatterPieces())
  const [placed, setPlaced] = useState<ReadonlySet<number>>(new Set())
  const [startedAt, setStartedAt] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (phase !== 'playing') return
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 250)
    return () => clearInterval(id)
  }, [phase, startedAt])

  const start = useCallback(() => {
    setOffsets(scatterPieces())
    setPlaced(new Set())
    setElapsedMs(0)
    setStartedAt(Date.now())
    setPhase('playing')
  }, [])

  const handleMove = useCallback((id: number, offset: Point) => {
    setOffsets((prev) => ({ ...prev, [id]: offset }))
  }, [])

  const handlePlace = useCallback(
    (id: number) => {
      setOffsets((prev) => ({ ...prev, [id]: { x: 0, y: 0 } }))
      setPlaced((prev) => {
        const next = new Set(prev).add(id)
        if (next.size === TOTAL) {
          setElapsedMs(Date.now() - startedAt)
          setPhase('complete')
        }
        return next
      })
    },
    [startedAt],
  )

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Japan Prefectural Puzzle</h1>
        <div className="status">
          <span className="stat" aria-label="Elapsed time">
            {formatTime(elapsedMs)}
          </span>
          <span className="stat">
            {placed.size} / {TOTAL}
          </span>
          <button type="button" className="primary" onClick={start}>
            {phase === 'idle' ? 'Start game' : 'Restart'}
          </button>
        </div>
      </header>
      {phase === 'idle' && (
        <p className="hint">Press &quot;Start game&quot;, then drag each piece to its place on the map.</p>
      )}
      <main className="stage">
        <Board
          offsets={offsets}
          placed={placed}
          interactive={phase === 'playing'}
          onMove={handleMove}
          onPlace={handlePlace}
        />
      </main>
      {phase === 'complete' && <CompleteModal elapsedMs={elapsedMs} onPlayAgain={start} />}
    </div>
  )
}

export default App
