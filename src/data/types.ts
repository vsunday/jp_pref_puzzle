export interface Prefecture {
  /** JIS X 0401 prefecture code (1-47). */
  id: number
  /** English name without the administrative suffix, e.g. "Kyoto". */
  name: string
  /** Japanese name, e.g. "京都府". */
  nameJa: string
  /** SVG path (absolute coordinates in board space). */
  d: string
  /** Bounding box in board space. */
  bbox: { x: number; y: number; width: number; height: number }
  /** Area-weighted centroid in board space. */
  centroid: { x: number; y: number }
  /** Index into the color palette (0-based). Adjacent prefectures never share one. */
  color: number
  /** Ids of neighbouring prefectures (shared/touching borders). */
  neighbors: number[]
}
