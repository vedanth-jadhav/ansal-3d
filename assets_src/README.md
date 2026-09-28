# assets_src — authored Blender sources

Authored `.blend` files live here, one directory per kit in build order
(see `docs/ASSET-PIPELINE.md` §5 and `kits.json`). Nothing in this tree
ships to the browser; `scripts/blender/export_all.py` validates and exports
to `assets/<kit>/*.glb` + `manifest.json`.

## Tree

```text
assets_src/
  README.md            (this file)
  kits.json            (kit build order, budgets, status)
  01-roads/            road segments, pavers, curbs            (tiled, n/a budget)
  02-houses/           builder floors, villas                 (< 3k tris)
  03-shop-houses/      market-road commercial frontages       (< 3.5k tris)
  04-landmarks/        7 pano-verified heroes                 (< 8k each)
  05-street-furniture/ poles, lights, cabins, bins            (< 500 tris)
  06-vegetation/       neem/peepal/palms/hedges               (< 1.5k tris)
  07-vehicles/        auto-rickshaw FIRST, then scooter/cycle (< 4k tris)
  08-characters/       reskins on the Quaternius rig          (< 6k tris)
  09-signage-decals/   wall ads, shop boards (alpha planes)   (< 300 tris)
```

## Per-asset files

- `<kit>_<piece>_<variant>.blend` — exactly one root, `<asset>_col`
  proxy, `<asset>_LOD1`, ≤ 3 shared materials (full rules in
  `docs/ASSET-PIPELINE.md`).
- `<kit>_<piece>_<variant>.meta.json` — optional; only needed for non-original
  (CC0) sources: `name, source_url, license, license_url, license_text_url,
  author`. Without it the asset is recorded as original Ansal 3D work.
- Textures (`<asset>_albedo.png`, ≤ 512 px) sit beside the `.blend`.

## Status workflow

`kits.json` tracks each kit as `not-started → in-progress → done`.
Mark a kit `in-progress` when its first `.blend` lands, `done` when every
asset in it passes `validate_asset.py` and is exported with a manifest.
