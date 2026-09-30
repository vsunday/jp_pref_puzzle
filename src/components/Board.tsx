import { useCallback, useEffect, useRef, useState } from 'react'
import { prefectures } from '../data/prefectures'
import type { Prefecture } from '../data/types'
import { prefectureLabel, type Language } from '../i18n'
import {
  pieceColor,
  VIEW_BOX,
  clampOffset,
  isNearHome,
  type Offsets,
  type Point,
} from '../game/puzzle'

interface BoardProps {
  offsets: Offsets
  placed: ReadonlySet<number>
  /** Pieces can only be moved while the game is running. */
  interactive: boolean
  onMove: (id: number, offset: Point) => void
  onPlace: (id: number) => void
  showLabels: boolean
  language: Language
}

interface DragState {
  id: number
  /** Pointer position minus piece offset, in board coordinates. */
  grab: Point
  pointerId: number
}

/** Pieces smaller than this get an invisible fat outline so they are easy to grab. */
const SMALL_PIECE = 45

export default function Board({ offsets, placed, interactive, onMove, onPlace, showLabels, language }: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  // The most recently touched piece is drawn last (on top).
  const [topId, setTopId] = useState<number | null>(null)

  const toBoard = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: pt.y }
  }, [])

  const dragId = drag?.id
  const grab = drag?.grab
  const pointerId = drag?.pointerId
  useEffect(() => {
    if (dragId === undefined || !grab) return
    const piece = prefectures.find((p) => p.id === dragId)
    if (!piece) return
    const currentOffset = { ...offsets[dragId] }
    let latest = currentOffset
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      const pos = toBoard(e.clientX, e.clientY)
      if (!pos) return
      latest = clampOffset(piece, { x: pos.x - grab.x, y: pos.y - grab.y })
      onMove(dragId, latest)
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      setDrag(null)
      if (isNearHome(latest)) onPlace(dragId)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
    // offsets is intentionally read only once per drag (initial value).
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, grab, pointerId, toBoard, onMove, onPlace])

  const startDrag = (e: React.PointerEvent, piece: Prefecture) => {
    if (!interactive || placed.has(piece.id) || drag) return
    const pos = toBoard(e.clientX, e.clientY)
    if (!pos) return
    e.preventDefault()
    const o = offsets[piece.id]
    setTopId(piece.id)
    setDrag({ id: piece.id, grab: { x: pos.x - o.x, y: pos.y - o.y }, pointerId: e.pointerId })
  }

  const free = prefectures.filter((p) => !placed.has(p.id))
  const ordered = [...free.filter((p) => p.id !== topId), ...free.filter((p) => p.id === topId)]

  return (
    <svg
      ref={svgRef}
      className="board"
      viewBox={`${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      role="img"
      aria-label="Map of Japan puzzle board"
    >
      {/* Slots: faint silhouette of the finished map */}
      <g className="slots">
        {prefectures.map((p) => (
          <path key={p.id} d={p.d} className="slot" fillRule="evenodd" />
        ))}
      </g>
      {/* Locked pieces */}
      <g>
        {prefectures
          .filter((p) => placed.has(p.id))
          .map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill={pieceColor(p)}
              className="piece locked"
              fillRule="evenodd"
              pointerEvents="none"
            />
          ))}
        {showLabels &&
          prefectures
            .filter((p) => placed.has(p.id))
            .map((p) => (
              <text key={p.id} x={p.centroid.x} y={p.centroid.y} className="label">
                {prefectureLabel(p, language)}
              </text>
            ))}
      </g>
      {/* Free pieces */}
      <g>
        {ordered.map((p) => {
          const o = offsets[p.id]
          const small = Math.max(p.bbox.width, p.bbox.height) < SMALL_PIECE
          const dragging = drag?.id === p.id
          return (
            <g
              key={p.id}
              transform={`translate(${o.x} ${o.y})`}
              className={`piece-group${interactive ? ' interactive' : ''}${dragging ? ' dragging' : ''}`}
              onPointerDown={(e) => startDrag(e, p)}
            >
              {small && (
                <path d={p.d} fill="transparent" stroke="transparent" strokeWidth={14} pointerEvents="all" />
              )}
              <path d={p.d} fill={pieceColor(p)} className="piece" fillRule="evenodd" />
              {showLabels && (
                <text x={p.centroid.x} y={p.centroid.y} className="label">
                  {prefectureLabel(p, language)}
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
