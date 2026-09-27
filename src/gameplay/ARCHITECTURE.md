# Modular source migration contract (work in progress)

This branch still runs a recovered compiled RC2 runtime with two editable overlays. Do not instantiate the modules in this folder beside that bundle: RC2 owns a requestAnimationFrame loop, player controller, camera and input listeners. The modules here are independently testable boundaries for a **future** full replacement, not a gameplay release.

- `WorldRuntime`: scene/LOD owner; `getSceneContext()` returns indexed `RoadNetwork`, static/dynamic `CollisionWorld`, POIs and `VehicleRegistry`. Existing RC2 geometry is not yet transferred.
- `RoadNetwork`: OSM way IDs retained; cell-index nearest queries, traversable route and roadside sampling. Road names are never invented. Graph edges from OSM must be verified for junction topology and access rules before missions or driving use them.
- `CollisionWorld`: static `Box3` projection and dynamic circles, conservative stepped sweep. Collision response and continuous exact time-of-impact are not production physics. Verify all y filtering, road edges and oblique wall slides before driving.
- `PlayerController`, `InputRouter`, `CameraDirector`: future single-owner seams. Existing `sM` in RC2 still owns these; do not run both at once.
- `VehicleRegistry`: consumes specialist `spawnVehicle({scene,x,z,yaw,kind})` handles; future `TrafficSystem` mediates ambient occupancy. The occupied player vehicle must be exempt from traffic's 260m visibility cull.
- `MissionRuntime`: only validated `reachPOI` stages in this staging code. Other mission stage types, six-stop migration, safe quick-travel lockout and reward/scoring need implementation and tests.
- `SaveStore`: v2-only storage shell. Migration, input validation, quota feedback and save cadence must be implemented before use.
- `GameLoop`: intended sole fixed-step scheduler (60 Hz, max four catch-up steps), once RC2 loop is retired. No side RAFs in specialist systems.

Contracts were guided by the gameplay, street-life and vehicle squad specs delivered September 27. StreetLife target `update(dt,cameraPos)`, cap 14 active rigs, 9-12 shared geometries, D Block r150 freeze. Vehicle factory meshes and traffic behavior remain specialist-owned. Target ceiling: 150 calls, 300k triangles, 200 session geometries; use the stricter settled and ring QA. No physical-phone claim.

Legacy `Township dash`, `Field notes`, and `The long way home` scored missions remain in the RC2 code. The existing travel select is now blocked while one of those missions is active; it still works for free-roam six-stop QA. That is a narrow safeguard, not a new mission engine or score anti-cheat.
