# Ansal 3D — Blender Asset Pipeline (Workstream C)

Contract for all authored Blender work. Read this before opening Blender.
Authoring tool: **Blender 4.0.2 + mcp-for-blender**. No asset lands in the
scene without passing `scripts/blender/validate_asset.py`.

Status quo it replaces: today every street is procedural box-soup with
per-box vertex colors (see `src/catalog-furniture-density.js` — one merged
`BoxGeometry` per fixture type, colour baked per vertex). That approach
cannot carry landmarks, rickshaws, or trees. The future is authored
`.blend` in `assets_src/<kit>/`, validated, exported to `.glb` in
`assets/<kit>/` with a manifest beside it.

## 1. Units, axes, origin

- **1 unit = 1 metre.** Model at real-world size. Scene units: metric, unit
  scale 1.0.
- **Y-up on export** (`export_yup=True` in `export_all.py`; glTF convention).
  Inside Blender the up axis stays Z — do not rotate the root to "fix" up.
- **-Z forward** for vehicles and characters (Blender convention: forward is
  -Y; glTF export with `export_yup` maps it — keep the Blender-standard
  -Y-forward build and verify facing in the viewer, never counter-rotate).
  Correction: build vehicles/characters facing **-Y in Blender** (= -Z
  forward after Y-up glTF export). Check facing in the Three.js viewer, not
  by eye in Blender.
- **Origin at ground center**: root origin at `(0, 0, 0)`, i.e. centre of the
  footprint on the ground plane. Validator requires LOD0 min world-Z within
  **2 cm of 0**. Centered origins keep roadside placement math (cf.
  `roadClearance` in `catalog-furniture-density.js`) working unchanged.

## 2. Naming

- Assets: `<kit>_<piece>_<variant>` — e.g. `house_builderfloor_a01`,
  `vehicle_autorickshaw_a01`, `tree_neem_a02`, `landmark_watertank_mushroom`.
- Collision proxy: `<asset>_col` — a separate low-poly mesh, invisible in
  render (no material or a `collision` material excluded from export), used
  for walk-mode blocking. Validator: exactly one, **< 300 tris**.
- LODs: LOD0 is the asset meshes themselves; reduced copy named
  `<asset>_LOD1`. Validator: LOD1 object must exist. LOD1 budget ≈ 40% of
  LOD0. (No LOD2 — draw distances are short, one step suffices.)
- One asset = one root: exactly one parent-less object (EMPTY, MESH, or
  ARMATURE for characters). `_col` and `_LOD1` are parented under it.
- Textures: `<asset>_<map>.png` (e.g. `house_builderfloor_a01_albedo.png`)
  stored beside the `.blend`.

## 3. Triangle budgets (LOD0, per asset)

| Kit | Budget | Notes |
|---|---|---|
| 01 roads | n/a — tiled | Tileable segments, never one big slab; reuse the 38-PNG material kit |
| 02 houses | < 3 000 | Builder floors are boxes with trim; detail via texture, not geometry |
| 03 shop-houses | < 3 500 | Slightly above houses (signage boards, awnings) |
| 04 landmarks | < 8 000 each | Hero exception; towers hit it via instanced balcony/floor repetition |
| 05 street-furniture | < 500 | Poles, lights, bins, cabins — instanced dozens of times |
| 06 vegetation | < 1 500 | Neem/peepal canopy via crossed alpha planes, not modelled leaves |
| 07 vehicles | < 4 000 | Includes wheels as separate low-poly meshes for spin |
| 08 characters | < 6 000 | Reskins on the existing Quaternius rig, same armature |
| 09 signage-decals | < 300 | Painted wall ads / shop boards (alpha planes) |

Rationale: furniture and signage instance the most, so they are cheapest;
characters cost the most because one rig carries all animation. Landmarks
are few but focal — the only kit allowed past vehicles.

## 4. Texture and material rules

- **512 px max** per texture (matches the 38-PNG kit in `public/materials`,
  all 512×512). No 2K "hero" textures — facades read at street distance.
- **Reuse the material kit first**: the 38 PNGs in `public/materials`
  (`plaster_cream`, `plaster_ivory`, …) cover the district palette. New
  textures only for motifs the kit cannot express (rainbow school stripes,
  arch-gate relief, wall-ad lettering).
- **Shared materials, never one material per house.** A handful of
  `mat_wall_cream`, `mat_gate_steel`, … shared across the kit. Validator
  enforces **≤ 3 materials per asset**.
- Albedo only + painted relief (the material kit's own convention: "subtle
  material relief and roughness are painted into albedo; no separate normal
  or roughness textures"). No normal/roughness maps for street assets.
- Texture PNGs ship **beside the .glb** and are recorded as `dependencies`
  in the manifest (same rule as `public/accents/manifest.json` notes).

## 5. Kit build order (with rationale)

`assets_src/kits.json` is the ordered source of truth (all `not-started`).

1. **01-roads** — everything snaps to roads; dusty asphalt + paver variants
   unblock placement of all later kits.
2. **02-houses** — the bulk of the district (2–3 fl builder floors per
   `district_regencia_visual_rules.md`); establishes wall/gate/paver palette.
3. **03-shop-houses** — commercial frontages on Ansal Market Rd; reuses
   house walls + adds boards/awnings.
4. **04-landmarks** — the 7 pano-verified heroes, in this order: Regencia
   towers + red-pillar gate → white shikhar temple → mushroom water tank →
   arch gate monument → roundabout column → rainbow school → blue-glass
   offices. Orientation landmarks first (towers visible district-wide).
5. **05-street-furniture** — poles, transformers, street lights, utility
   boxes, guard cabins, dumpsters. Replaces the box-soup in
   `catalog-furniture-density.js` one fixture type at a time.
6. **06-vegetation** — neem/peepal (broadleaf; the accents pack notes say
   available CC0 trees were pine/billboard forms, "visually wrong for
   neem/peepal" — so these are bespoke), plus palms/hedges for upscale belts.
7. **07-vehicles** — **AUTO-RICKSHAW FIRST**: the accents manifest records
   "no suitable CC0/MIT rickshaw, scooter, cycle … could be
   source-and-visual-verified", so the rickshaw is bespoke asset #1, then
   scooter/cycle/kurta-pedestrian-scale traffic.
8. **08-characters** — reskins on the existing Quaternius rig (accents-2:
   "modern casual shirt and trousers, not a kurta; alter top geometry and
   palette"). Same armature, Walk/Run/Idle preserved.
9. **09-signage-decals** — painted wall ads ("S.D. VIDYA MANDIR"), shop
   boards, to-rent/sale signs; replaces the `sign()` proxies last, once real
   walls exist to hang them on.

## 6. Licensing

- **CC0 1.0 only, or original work.** No CC-BY, no "editorial use", no
  unlicensed photo textures. If it is not CC0 and not painted by us, it does
  not ship.
- **Attribution file per asset**: every export writes `<asset>.meta.json`
  beside the `.blend` (fields below) and the kit `manifest.json` carries the
  same fields as `public/accents/manifest.json`:
  `name / category / file / source_url / license / author / bytes / triangles`
  (+ `license_url`, `license_text_url`, `sha256`, `dependencies`).
- Original work uses `license: "Original work — Ansal 3D"`,
  `author: "Ansal 3D contributors"`, `source_url: ""`.
- **Never redistribute Google Street View pixels.** Street View is
  paint-over reference only: look, then paint original albedo by hand (the
  material kit's provenance line is the template — "illustrative material
  motifs, not sampled/photographic Street View pixels").

## 7. Accuracy disclaimer (match index.html tone)

Every manifest `notes` and every landmark doc carries the site's own voice:

> Buildings near sampled panorama anchors are **stylized street vignettes,
> not surveyed footprints**. Tower footprints and placements remain
> illustrative. This is an artful exploration, not a navigation map or an
> as-built survey.

Rules: cite pano dates (June 2023) where a design decision comes from
imagery; mark unverified placements "illustrative"; never claim a facade,
count, or footprint as surveyed.

## 8. Workflow

```sh
# author in Blender 4.0.2, save to assets_src/<kit>/<asset>.blend
# (+ optional <asset>.meta.json for non-original attribution)
# validate one asset headless:
blender --background assets_src/02-houses/house_builderfloor_a01.blend \
  --python scripts/blender/validate_asset.py -- --kit houses
# batch-export a kit (re-validates, writes assets/<kit>/*.glb + manifest.json):
blender --background --python scripts/blender/export_all.py -- --kit houses
# export everything in kits.json order:
blender --background --python scripts/blender/export_all.py -- --all
```

`validate_asset.py` prints PASS/FAIL per check with numbers and exits
nonzero on failure; `export_all.py` skips failed assets and reports them —
a red asset never silently ships.
