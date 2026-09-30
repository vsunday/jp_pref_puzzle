import { useCallback, useEffect, useState } from 'react'
import './App.css'
import Board from './components/Board'
import CompleteModal from './components/CompleteModal'
import { prefectures } from './data/prefectures'
import { LANGUAGES, STRINGS, type Language } from './i18n'
import { formatTime, scatterPieces, type Offsets, type Point } from './game/puzzle'

type Phase = 'idle' | 'playing' | 'complete'

const TOTAL = prefectures.length

function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [offsets, setOffsets] = useState<Offsets>(() => scatterPieces())
  const [placed, setPlaced] = useState<ReadonlySet<number>>(new Set())
  const [startedAt, setStartedAt] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [language, setLanguage] = useState<Language>('ja')
  const [showLabels, setShowLabels] = useState(false)
  const t = STRINGS[language]

  useEffect(() => {
    document.title = t.title
    document.documentElement.lang = language === 'en' ? 'en' : 'ja'
  }, [t.title, language])

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
        <h1>{t.title}</h1>
        <div className="status">
          <label className="toggle">
            <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
            {t.labels}
          </label>
          <div className="lang" role="group" aria-label={t.language}>
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`lang-btn${language === l.value ? ' active' : ''}`}
                aria-pressed={language === l.value}
                onClick={() => setLanguage(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className="stat" aria-label={t.elapsed}>
            {formatTime(elapsedMs)}
          </span>
          <span className="stat">
            {placed.size} / {TOTAL}
          </span>
          {phase !== 'idle' && (
            <button type="button" className="primary" onClick={start}>
              {t.restart}
            </button>
          )}
        </div>
      </header>
      <main className="stage">
        <Board
          offsets={offsets}
          placed={placed}
          interactive={phase === 'playing'}
          onMove={handleMove}
          onPlace={handlePlace}
          showLabels={showLabels}
          language={language}
        />
        {phase === 'idle' && (
          <div className="start-overlay">
            <p className="hint">{t.hint}</p>
            <button type="button" className="primary start-btn" onClick={start}>
              {t.start}
            </button>
          </div>
        )}
      </main>
      {phase === 'complete' && <CompleteModal elapsedMs={elapsedMs} onPlayAgain={start} language={language} />}
    </div>
  )
}

export default App
