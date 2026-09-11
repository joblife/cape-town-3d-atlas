# Cape Town Atlas

An interactive field guide to Cape Town. A live three-dimensional model of the city,
built from OpenStreetMap data and real elevation, lit by the actual position of the
sun, organised into districts and narrated routes.

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # typecheck + production bundle into dist/
npm run preview        # serve the bundle
npm run verify:data    # validate the content layer
```

No API keys. Tiles and elevation stream at runtime from OpenFreeMap and AWS Terrain
Tiles; weather comes from Open-Meteo; archival photographs come from Wikipedia.

## Two products, one city

| | |
| --- | --- |
| **Cape Town Atlas** — `/` | A cinematic fly-through. Real tiles and terrain, 37 places, 12 districts, 5 narrated routes. |
| **Stap Kaap** — `/stapkaap/` | A walkable miniature. Street-level first-person movement over building geometry baked from OpenStreetMap, 17 landmarks to walk up to and read, a notebook, and the city wrapped onto a little planet for the overview. |

They share the content layer, the solar model and the palette, so they agree about
what time it is and what a place is. Progress is shared too: a place read in one is
already known to the other.

`stap` is Afrikaans for *walk*.

### Baking Stap Kaap's city

The walk needs building geometry that is real, static and cheap to draw every frame,
which a map renderer cannot supply at street level. So the walkable core is extracted
from OpenStreetMap once and shipped as an asset:

```bash
npm run bake:stap      # → public/stap/city.json (14,200 buildings, 8,377 streets)
```

It queries the Overpass API (with mirror fallback) for buildings, streets, parks and
water across the City Bowl, Bo-Kaap, the Waterfront and Woodstock, projects them to a
local metre plane rounded to decimetres, and writes about 3 MB. Re-run it to refresh
the city from current OSM data.

**Built by [DeepSeek V4.1 Flash](https://www.deepseek.com/news/deepseek-v4-1-flash/)**,
working as an agent across this repository — content research and writing, the solar
and lighting model, the camera, the data layer and the interface. The map data is
other people's work and is credited under Sources; the atlas built on top of it is
machine-written, and the About panel in the app says so too.

---

## What it is

**A model, not a picture.** Buildings are extruded from OSM footprints and storey
counts, draped over SRTM terrain. Everything is drawn live, so the city can be
examined from any angle at any time of day.

**Light that is real.** Solar position is computed for Cape Town's coordinates with
the NOAA almanac formulation (altitude and azimuth to about 0.01°). Four measured
light states — night, twilight, golden, day — are blended continuously as a function
of the sun's altitude rather than switched between, so the ground, sea, roads,
buildings and sky all move together through the day. Live cloud cover from
Open-Meteo then flattens and greys the light, which is the main reason the same city
reads differently on different days. The time control exposes a 24-hour solar arc
that can be dragged: sunrise, solar noon and sunset for today are computed, not
assumed.

**Content with a point of view.** 37 places, each with a standfirst, a 2–4 paragraph
story, facts, often a timeline, things to look for on the ground, and practical
notes. Twelve districts carry their own essays and a drawn boundary on the map. Five
routes string places into arguments about the city — how the mountain and the harbour
squeeze the centre, what was removed under apartheid, how the mountain makes the
weather, what the cold Atlantic edge is like, and how this harbour connected the Cape
to the world.

**A camera with intent.** Flights are composed: duration follows distance and zoom
change, long hops arc high, short hops stay low, arrivals swing in and settle rather
than stopping dead, and the framing respects whatever panels are on screen so a place
is never parked underneath the interface. Any gesture interrupts a flight.

## Using it

| Input | Action |
| --- | --- |
| `⌘K` / `Ctrl K` | Search places, districts and routes |
| `←` `→` | Previous / next place |
| `Space` | Play or pause the current route |
| `T` | Light control (24-hour solar arc, live weather) |
| `F` | Fly back to the whole city |
| `P` | Photo mode — hides every panel |
| `D` | District boundaries |
| `1` `2` `3` | Places / districts / stories |
| `?` | About, sources and limitations |
| `Esc` | Close whatever is open |

Drag to orbit, scroll to move in, right-drag to pan, two fingers to pinch and rotate.
On a phone the index is a draggable bottom sheet and dossiers open full screen.

The URL carries the view: `?place=castle-of-good-hope`, `?district=table-mountain`,
`?cam=lon,lat,zoom,pitch,bearing`, `?t=minutes`, `?photo=1`. A copied link restores
the exact camera, so a view can be sent to someone.

## Architecture

```
src/
  main.ts               entry: wiring, actions, keyboard, boot sequence
  core/
    atlas.ts            owns MapLibre; retargets paint for the light; hit testing
    camera.ts           composed flights, interruption, inset-aware framing
    lighting.ts         the clock: sun → palette → map, plus live weather
    presets.ts          four light states and the blending between them
    sun.ts              solar/lunar geometry, rise/set, day length
    story.ts            story playback: flights, holds, scrubbing
    state.ts            observable store + URL mirroring
    geo.ts              distance, framing offsets, flight timing
  map/style.ts          the map style, authored against the OMT schema
  layers/               district plates, star field
  ui/                   rail, dossier, player, search, light dialog, beacons, …
  data/                 authored content (places, districts, stories) + index
  styles/               design tokens and per-surface stylesheets
```

**Data flow.** `data/index.ts` joins the authored content files, derives district
membership and search, and exposes lookups. `Lighting` owns the clock and, on each
tick, computes solar geometry, blends the surface palette, and retargets the map's
paint, sky, light and hillshade. `Store` holds view state and mirrors it into the URL.
UI modules render from a snapshot; nothing reaches into anything else's internals.

**Light without style reloads.** The map style is built once with daylight paint.
Changing the light retargets paint properties — it never swaps the style — so tiles
are never reloaded and the sun can move continuously. The directional light is
anchored to the map, so its azimuth is geographic: a north-facing wall is in shadow
when the sun is in the north, and the shading stays correct as the map rotates.

**Every colour is applied.** The palette is a `Record<SurfaceKey, string>` and each
key maps to a set of layers by `SURFACE_LAYERS`. A key with no layer is dead
configuration, so the validator-adjacent rule is simply: if it is in the palette, it
paints something.

### Content

`scripts/verify-data.mjs` enforces the invariants that a reader would notice:
unique kebab-case ids, coordinates inside greater Cape Town, camera zoom/pitch/framing
ranges, hero cameras near their subject, district centres inside their own polygons,
every place inside its district's drawn boundary, story stops that resolve to real
places with narration of a sane length, and no duplicates within a route.

`src/data/types.ts` is the contract. Adding a place means dropping an object into the
appropriate `places-*.ts` file and re-running `npm run verify:data`.

## Honesty about the model

Building geometry is approximated from footprints and storey counts, not surveyed:
roof shapes, interiors and the heights of untagged buildings are inferences, and the
terrain is smoothed to a 30 m grid. The model is a miniature, so terrain is
exaggerated 1.18× and building heights 1.2× — a city of two- and three-storey
buildings reads flat otherwise. Both are adjustable in the layers panel and stated in
the About dialog. Nothing here substitutes for looking at the actual place, and
openings, prices and timings change.

## Sources

- Buildings, roads, land cover: © OpenStreetMap contributors, served as vector tiles
  by OpenFreeMap (openmaptiles schema).
- Elevation: Mapzen / AWS Terrain Tiles (SRTM and GMTED2010, courtesy USGS).
- Weather: Open-Meteo.
- Photographs and encyclopaedia extracts: Wikipedia and Wikimedia Commons, credited
  per place where used.
- Type: Fraunces and Instrument Sans (Google Fonts).
