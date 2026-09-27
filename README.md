# Ansal Sushant City recovery scaffold

This branch wraps the deployed RC2 v65b bundle as frozen runtime truth. It is **not** a recreation of the editable original source, and the public asset mirror is incomplete. Run `npm install && npm run build`; after all assets are recovered, use `npm run dev -- --port 5188`. New modular work should replace, not edit, the frozen bundled JS. Keep the public ledger and evidence files in every build; record catalog and budget changes at merge time. No Google imagery is bundled.

Deployment requirement from parent: retain the user’s Cloudflare Web Analytics beacon in deployment HTML. The local QA build omits it intentionally; use `node scripts/build-deploy.mjs` only for a parent-approved deploy target. This does not authorize deployment or release.

## Recovered fragments
- `sector12-v90-recovered-excerpt.js` is a syntax-checked complete scoped housing array and function but depends on the missing module context.
- `src/catalog-furniture-density.js` is the specialist module; it is not wired into frozen RC2. The main.patch targets the missing modular main source.

## Recovery state, 2026-09-27 15:55 IST
- Local public/ contains all 136 CRC-checked, byte-matching files from canonical RC2 mirror v3 plus six real GLB-relative `Textures/` PNGs fetched and PNG-validated against the immutable RC2 URL. These six were missing from production packaging and fix ten GLTFLoader console errors in the local smoke test.
- All 38 material PNGs listed in `materials/manifest.json` match that manifest's SHA-256. The runtime asks for `gate_steel_grey.png`, not shipped or listed by the manifest; RC2 returns soft-200 HTML at this path. Keep the code fix for the modular branch rather than silently pretending an image is there.
- `asset-manifest-first-pass.json` is a curated path candidate list, not exhaustive interactive route QA. The ledger now lists canonical v90 catalog IDs with their status and replays 85 historical and local staging events. New IDs have generic unassigned scene detail unless a recorded patch actually touched them. This is a truthful work ledger, not a complete v90 geometry claim.
- `qa-recovery.mjs` only smoke-tests landing + entering play in mobile landscape. It does not verify six stops, draw-call budgets, collision paths, or the user's physical phone.
- `src/recovered/runtime-v65b.formatted.js` is a formatted inspection copy of the deployed bundle, not original source and not imported. `src/main.js` imports a narrow modified copy of the frozen deployed bundle to mount the furniture and v90 scoped housing modules, not a complete modular rebuild. The original unchanged deployed bundle remains in `public/assets/` and `src/recovered/runtime-v65b.min.js`; specialist source patches still need a distinct editable modular branch.

- `public/parcel-catalog-v90.jsonl` is the canonical v90 catalog furnished by the parent/reference squad (1705 rows, SHA-256 ab2ee49dfb716c170128a8467952a3c443e4c5d00c07dba0dfd8a4523e69d0be). `public/LEDGER.md` has been regenerated against v90 with historical RC2 changes and two explicitly local staging records; do not read generic rows as implemented geometry. Do not normalize the 372 historical sub-meter coordinate deviations without an explicit decision.

## Transitional local hook
- `src/recovered/runtime-v65b-furniture-hook.min.js` changes only the compiled RC2 bundle to expose the scene and debug warp for QA, call `addCatalogFurnitureDensity(scene,roads)` after other street furniture is created, and map an absent `gate_steel_grey` texture request to the shipped `gate_steel_blue`. The parent must not call this recovered original source.
- Specialist six-stop QA shows zero furniture draw delta at those six default arrival views. Closer `market-west` shows +1 call/+312 triangles and a visible signboard; SN3 close samples showed zero draw delta at their tested headings. Need deliberate local framing and collision QA before accepting the whole fixture pass.

- `scripts/render-ledger.py` regenerates the source-tree `public/LEDGER.md` from canonical v90 and `public/docs/ledger/merge-log.jsonl`. Run it on every substantive merge; do not reinterpret catalog evidence coverage as scene implementation.

### Open collision concern
A keyboard-walk probe at four Sector 12 road points moved only ~0.24-0.71 m in 1.1 s, and the untouched RC2 baseline moved comparably. No nearby colliders at SN1/SN4 starting points. This may be a headless frame-rate/input artifact; it does not prove a regression, but the full route/collision acceptance has not run. Do not mark it passed.

### Staged v90 Sector 12
`src/sector12-v90-builder.js` and `src/sector12-v90-housing.js` contain the recovered scoped function and thin module wrapper. Runtime reports 110 IDs, 81 built, 19 vacant, 6 unfinished, 2 wall-only, 1 kiosk, 1 shrine, 33 LOD cells and zero omitted, but 13 decorative boxes clipped by road clearance. Four 844x390 approaches at SN1, SN4 and SN6 were inspected; complete tank/market sweep and route QA are still open. Overlap with original generic RC2 housing and physical-device rendering also remain open.

### Sampled envelopes
844x390 D Block 20 headings max 118 calls / 159,189 triangles / 165 geometries; tank 24 headings max 141 / 275,503 / 168; market junction 24 headings max 143 / 275,865 / 169. No page errors. These samples meet 150/300k/200 ceilings but are not a cold-load/global maximum or visual final. Market last-frame pixels include a thin floating-looking distant object; a housing-disabled RC2 control reproduced it, so it is inherited but still requires identification/correction.

### Six-stop sampled route
At 844x390, quick-travel Regencia/temple/tank/Sector12/F-Block/D Block reached 1/6 through 6/6 and exit worked; zero page errors or HTTP failures. All six screenshots were visually inspected for nonblack scene, character, local streets/HUD. Per-stop calls/triangles/geometries in the latest ledger event. This does not establish walked collision paths or visual match to original reference angles.

### Collision spot check
At SN1 (-222,-550), SN4 (-172,-720), SN6 east (103,-850) and SN6 junction (92,-843), there are zero nearby collision boxes in a 5 m debug query. At SN6 west (84,-850), housing adds a house and two wall/gate boxes within 5 m (RC2 baseline had none); that point is ~13.8 m from the nearest OSM residential road centerline, so do not assume it is drivable asphalt. Full continuous walked-route QA remains open.

### 2026-09-27 v90 collision and market visual correction
The old overlap/sliver notes above are history. Current staging moved one generic decorative broad tree from (-81,-700), where it crossed verified-pano house ANS-SN4S-015, to the catalog's neighboring ANS-SN4S-017 treed vacant plot at (-56.3,-709.7), an explicitly illustrative placement. A 345-collider local audit found zero footprint overlaps with sampled inherited small meshes, and the 8,177-point/86-road-segment sweep found zero intersections up to 2m clearance. Continuous walking remains inconclusive because both untouched RC2 and this stage move slowly under headless SwiftShader.

The floating bar at the market was **not** part of frozen RC2: disabling housing left the furniture overlay on. Group isolation found the catalog-furniture `corner-board` recipe's detached cap; removing only that cap keeps the catalog-backed sign. Before/after 844x390 pixels were inspected. Post-fix 20-heading D Block and 24-heading tank/market envelopes remain under 150/300k/200; see LEDGER. Actual phone and long settled sweeps remain open. No deployment.

The new GTA-style-depth architecture mandate requires clean gameplay seams (world, indexed roads, swept collision, player/vehicle ownership, camera, input, mission, save, one scheduler) before new game systems are called integrated. Vehicle, street-life and gameplay squad specs are staged with parent. Current compiled-RC2 hook is not that architecture and must not be advertised as one.

### Modular seam branch, 2026-09-27
`src/world/` provides a live, read-only WorldRuntime query facade over OSM road segments and existing static collider boxes; it does not own geometry or replace RC2. `src/gameplay/`, `src/vehicles/`, `src/traffic/` reserve unit-tested or compile-checked contracts for the architectural migration. See `src/gameplay/ARCHITECTURE.md`. Only the recovered RC2 loop runs, and the interfaces must not be mistaken for drivable gameplay, new missions or a maintainable original-source equivalent. Unit tests: `node --test test/world-contracts.test.mjs`.

The original source port remains open. `src/world/README.md` is the explicit port order and records what scene inventory cannot prove. The live `WorldRuntime` facade does not make the compiled bundle a maintainable modular rebuild.

The mirrored `public/index.html` and `public/robots.txt` had stale HTML and the analytics beacon; `public/index.html` was removed so it cannot serve an older bundled app at `/index.html`, and `robots.txt` is now a valid robots file. `scripts/build-deploy.mjs` injects the beacon only into deployment-target output. The root Vite `index.html` remains local QA without analytics.
