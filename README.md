# Cape Town — A city in miniature

**Live: https://joblife.github.io/cape-town-3d-atlas/**

Field Atlas № 02. A 3D miniature of Cape Town in the same spirit as the Gurgaon 3D Atlas:
real-world map data, 14 landmark stops, a guided city tour, and three ways to see the light.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Or serve the production build:

```bash
npm run build
npm run preview  # http://localhost:4173
```

No API keys needed. Tiles stream from OpenFreeMap + AWS terrain at runtime.

## What it does

- **3D miniature** — OpenFreeMap vector tiles (© OpenStreetMap) extruded to 3D
  buildings, draped over Mapzen/AWS Terrarium terrain with Table Mountain relief.
- **14 stops** — Table Mountain Cableway, Bo-Kaap, V&A Waterfront, Zeitz MOCAA,
  Cape Town Stadium, Sea Point Promenade, Lion's Head, Company's Garden,
  City Hall & Grand Parade, Castle of Good Hope, District Six, Long Street,
  Kirstenbosch, Camps Bay (`landmarks.js` — edit coords/copy freely).
- **City tour** — auto-flies stop to stop (~5s each); `Space` toggles, `←/→` steps.
- **Day / Sunset / Night** — sky, fog, sun + building wash presets.
- **Field Atlas UI** — explorer panel, floating map labels with de-collision,
  place-detail card, compass/zoom/reset tools, layers panel (buildings, labels,
  terrain, height exaggeration), data & credits modal.

## Colour recipe (adapted from the Seoul 3D Atlas)

The 3D scene follows the Seoul atlas's light-miniature recipe (`PRESETS` in `app.js`):

| Element | Day | Sunset | Night |
|---|---|---|---|
| Ground base | `#b3b9a1` grey-sage (soft on the eyes) | `#c2b493` warm paper | `#23353c` deep teal-navy |
| Woods / forest | `#4f6b4f` | `#4d5c3e` | `#16281f` |
| Parks | `#6e8c5f` | `#6d7448` | `#1b3029` |
| Fynbos / grass | `#8e9578` grey-olive | `#8d8a6a` | `#22352b` |
| Sand / beach | `#eee5d0` ivory | `#ebcda4` | `#4c4a3a` |
| Rock | `#bec9c1` grey | `#b09a80` | `#2e3c42` |
| Sea | `#3d94b0` teal | `#739ba9` | `#205d72` |
| Reservoirs / rivers | `#2f7e9c` | `#5f8b9b` | `#2a7d97` (glow) |
| Roads | `#f1ede0` warm white | `#f5e3c2` | `#5f6f75` |
| Buildings | white `#f4f2ea` → blue-grey `#b9cdc9` by height | warm ivory → glass | slate → glowing cyan towers |

Sun `#fff2d6` / `#ffb579` / moon `#8dacd2`; terrain exaggeration 1.2×.

## Notes / differences vs the Gurgaon original

- The original pre-bakes a ~55 MB custom geometry binary (`atlas.bin.gz`) with
  satellite-corrected heights. This build streams live vector tiles instead, so
  it stays dependency-free and always current — at the cost of stylised rather
  than architect-accurate hero buildings (e.g. no bespoke cableway/museum models).
- OSM `building:levels` heights are used where tagged (`render_height` /
  `render_levels` from OpenMapTiles); untagged buildings fall back to ~2 levels.
