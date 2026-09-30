import { MAP_HEIGHT, MAP_WIDTH, prefectures } from '../data/prefectures'
import type { Prefecture } from '../data/types'

export interface Point {
  x: number
  y: number
}

/** Distance (board units) within which a dropped piece snaps to its slot. */
export const SNAP_DISTANCE = 22

/** Free space around the map where pieces are scattered (board units). */
export const PAD_X = 120
export const PAD_Y = 90

export const VIEW_BOX = {
  x: -PAD_X,
  y: -PAD_Y,
  width: MAP_WIDTH + PAD_X * 2,
  height: MAP_HEIGHT + PAD_Y * 2,
}

/** Soft pastel colors; index = Prefecture.color. */
export const PALETTE = ['#f4a3a6', '#f7e08a', '#a3dcb8', '#f8c39a', '#c9b0e6', '#f3f3f3']

/**
 * Assign a color index to every prefecture so that neighbours differ while
 * the palette is used as evenly as possible.
 */
function balancedColors(count: number): Record<number, number> {
  const colors: Record<number, number> = {}
  const usage = new Array<number>(count).fill(0)
  const byId = new Map(prefectures.map((p) => [p.id, p]))
  // Neighbour lists are not guaranteed to be symmetric; make them so.
  const adj = new Map<number, Set<number>>(prefectures.map((p) => [p.id, new Set(p.neighbors)]))
  for (const p of prefectures) for (const n of p.neighbors) adj.get(n)?.add(p.id)
  const allowed = (id: number, c: number) => [...(adj.get(id) ?? [])].every((n) => colors[n] !== c)

  const order = [...prefectures].sort((a, b) => adj.get(b.id)!.size - adj.get(a.id)!.size || a.id - b.id)
  for (const p of order) {
    let best = -1
    for (let c = 0; c < count; c++) {
      if (allowed(p.id, c) && (best < 0 || usage[c] < usage[best])) best = c
    }
    if (best < 0) best = p.color // fall back to the precomputed minimal coloring
    colors[p.id] = best
    usage[best]++
  }
  // Rebalance: move pieces from the most used color to the least used one when legal.
  for (let pass = 0; pass < 50; pass++) {
    let moved = false
    for (const p of byId.values()) {
      const cur = colors[p.id]
      for (let c = 0; c < count; c++) {
        if (c !== cur && usage[c] + 1 < usage[cur] && allowed(p.id, c)) {
          colors[p.id] = c
          usage[cur]--
          usage[c]++
          moved = true
          break
        }
      }
    }
    if (!moved) break
  }
  return colors
}

const COLOR_OF = balancedColors(PALETTE.length)

export function pieceColor(p: Prefecture): string {
  return PALETTE[COLOR_OF[p.id] ?? p.color]
}

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
