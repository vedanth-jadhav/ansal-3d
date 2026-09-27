# World source port map

The imported RC2 bundle is not source-equivalent. The scene inventory enumerates root groups/meshes only and cannot recover semantic IDs or source constraints from anonymous merged geometry. The sampled local scene had 54 roots / 257 meshes, including one V90 group with 33 catalog housing cells, a generic district group with 57 meshes, a second anonymous group with 35 meshes, NPC/traffic/streetlife, and ten-plus GLB roots. Do not infer catalog detail from mesh count or mesh proximity.

Port order for the full modular branch:
1. OSM ground/roads/parks/boundary, fog/grade/lighting, camera/render loop into an owned WorldRuntime and GameLoop. Retain OSM way IDs and coordinates.
2. Regencia, northern/Sector12, southern/F-block and D Block builders into separate source modules with evidence boundaries, preserving v90 parcel statuses and the D Block freeze.
3. Move live scoped furniture, v90 housing, SN3/F 54 and C-Block 43 arrays into distinct builders. The last two are not present in this branch; obtain actual patches, do not fabricate IDs.
4. Rehome NPC/traffic/ambient life and specialist vehicle handles. One scheduler; GameLoop is inert until the legacy loop is retired. Player/Camera/Input only switch ownership when each full path works.
5. Move missions/save/POIs to stable ID-based data. Restrict scored quick travel, validate road-side targets, stage physical-phone QA, then run the full-chain suite. No public release before that.

The current `WorldRuntime` is a live read-only query facade, not step 1 done. The `RoadNetwork` uses an OSM vertex graph with no turn/access restriction or overpass topology audit. `CollisionWorld` conservatively projects static boxes to x/z; dynamic occupancies are queryable but no ambient system writes them yet. `sampleParkingNear` proposes a road-side point without validating a lot, fence or static collision. Treat all such results as hypotheses until world/vehicle integration and visual QA.
