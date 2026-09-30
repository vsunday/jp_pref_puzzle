# Japan Prefectural Puzzle

A jigsaw-style browser game: drag the 47 prefecture-shaped pieces onto the map of Japan.
Built with Vite, React 19 and TypeScript; the board is a single SVG.

## How to play

1. Press **Start game**. The pieces are scattered around the map and the stopwatch starts.
2. Drag (mouse or touch) each piece to its place. Dropping it close enough to the right spot snaps and locks it.
3. Adjacent prefectures never share a color (4 colors are enough for Japan's map), so use shape and position to find each piece.
4. When all 47 pieces are placed, the timer stops and a "Complete" dialog shows your time. **Play again** reshuffles and restarts.

Okinawa is shown as an inset in the sea west of Kyushu, and very small islands are omitted.

## Getting started

```bash
npm install
npm run dev      # development server
npm run lint
npm run build
```

## Regenerating the map data

`src/data/prefectures.ts` is generated (and committed) by `scripts/build-data.mjs`. It downloads the GeoJSON
(not stored in the repo), and then:

- projects lon/lat (equirectangular, cos(37 deg) correction) and drops islands under ~150 km2,
- computes prefecture adjacency from the raw borders (vertices within ~1 km),
- simplifies borders with a topology-preserving Douglas-Peucker (shared borders are simplified identically),
- moves Okinawa next to Kyushu as an inset,
- finds a minimum coloring of the adjacency graph (exact DSATUR backtracking; currently 4 colors),
- writes id, names, SVG path, bbox, centroid, color index and neighbors per prefecture.

```bash
npm run build:data                                  # downloads the source
node scripts/build-data.mjs path/to/japan.geojson   # or use a local copy
```

Tunables (island threshold, simplification, Okinawa offset, adjacency tolerance) are constants at the top of the script.

## Data attribution and license

Prefecture geometry comes from [dataofjapan/land](https://github.com/dataofjapan/land) (`japan.geojson`), which is
derived from [Global Map Japan](http://www.gsi.go.jp/kankyochiri/gm_jpn.html) (Geospatial Information Authority of Japan).
The repository has no LICENSE file; its README states the license follows the original distributor: for non-commercial use
the source (Global Map Japan) must be credited, and for commercial use it must be credited **and** usage reported to the
copyright holder. Please review this before any commercial deployment. The data here is simplified and modified
(Okinawa moved, small islands removed).

## Deploying to Vercel

The app is a static Vite build configured via `vercel.json`.

```
npm install
npx vercel login   # first time only
npx vercel         # preview deploy
npm run deploy     # production deploy
```

Or import the repository in the Vercel dashboard; the Vite preset is detected automatically.
