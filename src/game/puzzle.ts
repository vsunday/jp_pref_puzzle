import { MAP_HEIGHT, MAP_WIDTH, prefectures } from '../data/prefectures'
import type { Prefecture } from '../data/types'

export interface Point {
  x: number
  y: number
}

/** Distance (board units) within which a dropped piece snaps to its slot. */
export const SNAP_DISTANCE = 22

/** Free space around the map where pieces are scattered (board units). */
export const PAD_X = 230
export const PAD_Y = 190

export const VIEW_BOX = {
  x: -PAD_X,
  y: -PAD_Y,
  width: MAP_WIDTH + PAD_X * 2,
  height: MAP_HEIGHT + PAD_Y * 2,
}

/** Simple, high-contrast colors; index = Prefecture.color. */
export const PALETTE = ['#e5484d', '#3e7bfa', '#30a46c', '#f5c400', '#f76b15', '#8e4ec6']

/** Piece offsets are relative to the piece's home (correct) position; (0, 0) is solved. */
export type Offsets = Record<number, Point>

export function isNearHome(offset: Point, tolerance = SNAP_DISTANCE): boolean {
  return Math.hypot(offset.x, offset.y) <= tolerance
}

/** Clamp an offset so the piece's bbox stays fully inside the view box. */
export function clampOffset(p: Prefecture, o: Point): Point {
  const { bbox } = p
  return {
    x: Math.min(VIEW_BOX.x + VIEW_BOX.width - bbox.x - bbox.width, Math.max(VIEW_BOX.x - bbox.x, o.x)),
    y: Math.min(VIEW_BOX.y + VIEW_BOX.height - bbox.y - bbox.height, Math.max(VIEW_BOX.y - bbox.y, o.y)),
  }
}

/**
 * Random offsets that place every piece inside the view box but (when possible)
 * outside the map's bounding rectangle, i.e. around the board.
 */
export function scatterPieces(random: () => number = Math.random): Offsets {
  const result: Offsets = {}
  for (const p of prefectures) {
    const { bbox } = p
    const minX = VIEW_BOX.x - bbox.x
    const maxX = VIEW_BOX.x + VIEW_BOX.width - bbox.x - bbox.width
    const minY = VIEW_BOX.y - bbox.y
    const maxY = VIEW_BOX.y + VIEW_BOX.height - bbox.y - bbox.height
    let chosen: Point = { x: minX, y: minY }
    for (let attempt = 0; attempt < 200; attempt++) {
      const o = { x: minX + random() * (maxX - minX), y: minY + random() * (maxY - minY) }
      const left = bbox.x + o.x
      const top = bbox.y + o.y
      const overlapsMap =
        left < MAP_WIDTH && left + bbox.width > 0 && top < MAP_HEIGHT && top + bbox.height > 0
      chosen = o
      if (!overlapsMap) break
    }
    result[p.id] = chosen
  }
  return result
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
