#!/usr/bin/env node
/**
 * Generates src/data/prefectures.ts from the dataofjapan/land GeoJSON.
 *
 *   node scripts/build-data.mjs [path/to/japan.geojson]
 *
 * Without an argument the GeoJSON is downloaded (not stored in the repo).
 * Steps: filter tiny islands -> compute adjacency on the raw geometry ->
 * topology-preserving Douglas-Peucker simplification (shared borders are
 * simplified identically, so neighbours still fit together) -> move Okinawa
 * next to Kyushu as an inset -> scale to board space -> minimal graph coloring.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SOURCE_URL =
  'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson'
const OUT = fileURLToPath(new URL('../src/data/prefectures.ts', import.meta.url))

// ---- tunables (units: projected degrees unless noted) ----
const COS_LAT = Math.cos((37 * Math.PI) / 180) // equirectangular, centred on ~37N
const MIN_ISLAND_AREA = 0.012 // drop polygons smaller than this (~150 km2)
const SIMPLIFY_EPS = 0.008 // Douglas-Peucker tolerance (~0.8 km)
const ADJ_TOL = 0.01 // borders closer than this (~1 km) count as adjacent
const BOARD_WIDTH = 1000 // output width of the map in board units
const OKINAWA_ID = 47
const OKINAWA_SHIFT = { x: -2.8 * COS_LAT, y: -6.3 } // lon/lat degrees -> projected (y is -lat)
const PALETTE_SIZE = 6

// ---------- load ----------
async function load() {
  const arg = process.argv[2]
  if (arg) return JSON.parse(await readFile(arg, 'utf8'))
  console.log(`Downloading ${SOURCE_URL} ...`)
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const project = ([lon, lat]) => [lon * COS_LAT, -lat]
const key = ([x, y]) => `${Math.round(x * 1e5)},${Math.round(y * 1e5)}`
const ringArea = (r) => {
  let a = 0
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]
    const [x2, y2] = r[(i + 1) % r.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

function cleanRing(ring) {
  const out = []
  for (const p of ring.map(project)) {
    const last = out[out.length - 1]
    if (!last || key(last) !== key(p)) out.push(p)
  }
  if (out.length > 1 && key(out[0]) === key(out[out.length - 1])) out.pop()
  return out
}

function englishName(nam) {
  return nam.replace(/ (Ken|Fu|To)$/, '').replace(/ Do$/, 'do')
}

// ---------- simplification ----------
function perpDist(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Douglas-Peucker on an open polyline; endpoints are always kept. */
function douglasPeucker(pts, eps) {
  if (pts.length <= 2) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    let maxD = 0
    let idx = -1
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(pts[i], pts[s], pts[e])
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (idx >= 0 && maxD > eps) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return pts.filter((_, i) => keep[i])
}

/** Simplify an arc in a canonical direction so shared arcs match exactly. */
function simplifyArc(arc, eps) {
  const flip = key(arc[0]) > key(arc[arc.length - 1])
  const src = flip ? [...arc].reverse() : arc
  const res = douglasPeucker(src, eps)
  return flip ? res.reverse() : res
}

function simplifyRing(ring, sigs, eps) {
  const n = ring.length
  let anchors = []
  for (let i = 0; i < n; i++) {
    if (sigs[i] !== sigs[(i + n - 1) % n] || sigs[i] !== sigs[(i + 1) % n]) anchors.push(i)
  }
  if (anchors.length < 2) {
    // no junctions (isolated ring): split at the point farthest from a start vertex
    const s = anchors[0] ?? 0
    let far = s
    let best = -1
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(ring[i][0] - ring[s][0], ring[i][1] - ring[s][1])
      if (d > best) {
        best = d
        far = i
      }
    }
    anchors = [s, far].sort((a, b) => a - b)
  }
  const out = []
  for (let k = 0; k < anchors.length; k++) {
    const a = anchors[k]
    const b = anchors[(k + 1) % anchors.length]
    const arc = []
    for (let i = a; ; i = (i + 1) % n) {
      arc.push(ring[i])
      if (i === b && arc.length > 1) break
    }
    out.push(...simplifyArc(arc, eps).slice(0, -1))
  }
  return out
}

// ---------- coloring ----------
/** Exact minimal coloring: try k = 1,2,... with DSATUR-ordered backtracking. */
function minimalColoring(n, adj) {
  const deg = adj.map((s) => s.size)
  for (let k = 1; k <= PALETTE_SIZE; k++) {
    const colors = new Array(n).fill(-1)
    const solve = () => {
      // pick uncolored vertex with max saturation, ties by degree
      let v = -1
      let bestSat = -1
      for (let i = 0; i < n; i++) {
        if (colors[i] !== -1) continue
        const sat = new Set([...adj[i]].map((j) => colors[j]).filter((c) => c >= 0)).size
        if (sat > bestSat || (sat === bestSat && deg[i] > deg[v])) {
          bestSat = sat
          v = i
        }
      }
      if (v === -1) return true
      const used = new Set([...adj[v]].map((j) => colors[j]))
      for (let c = 0; c < k; c++) {
        if (used.has(c)) continue
        colors[v] = c
        if (solve()) return true
      }
      colors[v] = -1
      return false
    }
    if (solve()) return { k, colors }
  }
  throw new Error('No coloring within palette')
}

// ---------- main ----------
const geo = await load()
if (geo.features.length !== 47) throw new Error(`Expected 47 features, got ${geo.features.length}`)

// 1. parse + filter tiny islands
const prefs = geo.features
  .map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    let rings = polys.map((rs) => rs.map(cleanRing).filter((r) => r.length >= 3))
    const areas = rings.map((rs) => Math.abs(ringArea(rs[0])))
    const largest = Math.max(...areas)
    rings = rings.filter((_, i) => areas[i] >= MIN_ISLAND_AREA || areas[i] === largest)
    return {
      id: f.properties.id,
      name: englishName(f.properties.nam),
      nameJa: f.properties.nam_ja,
      polygons: rings, // polygons[] -> rings[] -> points[]
    }
  })
  .sort((a, b) => a.id - b.id)

// 2. adjacency from raw geometry (vertex proximity via spatial hash)
const cell = (v) => Math.floor(v / ADJ_TOL)
const grid = new Map()
prefs.forEach((p, pi) => {
  for (const poly of p.polygons)
    for (const ring of poly)
      for (const [x, y] of ring) {
        const k = `${cell(x)},${cell(y)}`
        if (!grid.has(k)) grid.set(k, [])
        grid.get(k).push([pi, x, y])
      }
})
const adj = prefs.map(() => new Set())
for (const [k, list] of grid) {
  const [cx, cy] = k.split(',').map(Number)
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const other = grid.get(`${cx + dx},${cy + dy}`)
      if (!other) continue
      for (const [pa, xa, ya] of list)
        for (const [pb, xb, yb] of other)
          if (pa !== pb && Math.hypot(xa - xb, ya - yb) <= ADJ_TOL) adj[pa].add(pb)
    }
}

// 3. topology-preserving simplification
const owners = new Map() // vertex key -> sorted list of pref indices
prefs.forEach((p, pi) => {
  for (const poly of p.polygons)
    for (const ring of poly)
      for (const pt of ring) {
        const k = key(pt)
        const s = owners.get(k) ?? new Set()
        s.add(pi)
        owners.set(k, s)
      }
})
const sigOf = (pt) => [...owners.get(key(pt))].sort((a, b) => a - b).join('.')
for (const p of prefs) {
  p.polygons = p.polygons.map((poly) =>
    poly.map((ring) => simplifyRing(ring, ring.map(sigOf), SIMPLIFY_EPS)).filter((r) => r.length >= 3),
  )
}

// 4. Okinawa inset
for (const poly of prefs.find((p) => p.id === OKINAWA_ID).polygons)
  for (const ring of poly)
    for (const pt of ring) {
      pt[0] += OKINAWA_SHIFT.x
      pt[1] += OKINAWA_SHIFT.y
    }

// 5. scale to board space
const all = prefs.flatMap((p) => p.polygons.flat(2))
const minX = Math.min(...all.map((p) => p[0]))
const maxX = Math.max(...all.map((p) => p[0]))
const minY = Math.min(...all.map((p) => p[1]))
const maxY = Math.max(...all.map((p) => p[1]))
const S = BOARD_WIDTH / (maxX - minX)
const tx = ([x, y]) => [(x - minX) * S, (y - minY) * S]
const r1 = (v) => Math.round(v * 10) / 10
const fmt = (v) => String(r1(v))

const out = prefs.map((p, pi) => {
  const polys = p.polygons.map((poly) => poly.map((ring) => ring.map(tx)))
  const flat = polys.flat(2)
  const x0 = Math.min(...flat.map((q) => q[0]))
  const x1 = Math.max(...flat.map((q) => q[0]))
  const y0 = Math.min(...flat.map((q) => q[1]))
  const y1 = Math.max(...flat.map((q) => q[1]))
  let A = 0
  let cx = 0
  let cy = 0
  for (const poly of polys)
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        const [xa, ya] = ring[i]
        const [xb, yb] = ring[(i + 1) % ring.length]
        const cr = xa * yb - xb * ya
        A += cr
        cx += (xa + xb) * cr
        cy += (ya + yb) * cr
      }
    }
  const d = polys
    .flatMap((poly) => poly)
    .map((ring) => 'M' + ring.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L') + 'Z')
    .join('')
  return {
    id: p.id,
    name: p.name,
    nameJa: p.nameJa,
    d,
    bbox: { x: r1(x0), y: r1(y0), width: r1(x1 - x0), height: r1(y1 - y0) },
    centroid: A ? { x: r1(cx / (3 * A)), y: r1(cy / (3 * A)) } : { x: r1((x0 + x1) / 2), y: r1((y0 + y1) / 2) },
    neighbors: [...adj[pi]].map((j) => prefs[j].id).sort((a, b) => a - b),
  }
})

// 6. coloring
const { k, colors } = minimalColoring(prefs.length, adj)
out.forEach((p, i) => (p.color = colors[i]))
for (const p of out)
  for (const n of p.neighbors)
    if (out.find((q) => q.id === n).color === p.color) throw new Error('Invalid coloring')

const mapWidth = r1((maxX - minX) * S)
const mapHeight = r1((maxY - minY) * S)
const body = out
  .map(
    (p) =>
      `  { id: ${p.id}, name: ${JSON.stringify(p.name)}, nameJa: ${JSON.stringify(p.nameJa)}, color: ${p.color}, neighbors: ${JSON.stringify(p.neighbors)}, bbox: ${JSON.stringify(p.bbox).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ')}, centroid: ${JSON.stringify(p.centroid).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ')}, d: ${JSON.stringify(p.d)} },`,
  )
  .join('\n')

const source = `// GENERATED by scripts/build-data.mjs - do not edit by hand.
// Source: dataofjapan/land japan.geojson (derived from Global Map Japan, GSI).
// Okinawa is drawn as an inset (moved next to Kyushu); small islands are omitted.
import type { Prefecture } from './types'

/** Size of the map in board units. */
export const MAP_WIDTH = ${mapWidth}
export const MAP_HEIGHT = ${mapHeight}
/** Minimum number of colors needed for the adjacency graph. */
export const COLOR_COUNT = ${k}

export const prefectures: Prefecture[] = [
${body}
]
`
await writeFile(OUT, source)
const edges = adj.reduce((s, a) => s + a.size, 0) / 2
console.log(`Wrote ${OUT}: ${(source.length / 1024).toFixed(1)} KB, ${edges} adjacencies, ${k} colors, map ${mapWidth}x${mapHeight}`)
