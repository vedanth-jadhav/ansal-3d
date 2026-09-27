# Visual Rules - La Regencia / Ansal Sushant City Core District (Panipat)
Audited from 573 Street View panoramas (44 chains, all imagery 2023-06). Companion file: `district_regencia_spec.json` (per-segment detail, every claim pano-tagged). Uncovered segments are marked uncovered there - nothing below is invented.

## District signature (use everywhere unless a segment says otherwise)
- **Housing stock**: modern plotted builder floors, 2-3 floors (occasionally 4), flat roofs with roof-deck railings. Palette: brown, grey, cream renders with wood-tone or stone cladding accents. Gates: dark steel or wood-slat. Driveway aprons: checkered or striped interlocking pavers. Hedges and small lawns at the plot edge.
- **Vacancy**: a defining trait. Roughly a quarter to a third of plots are vacant - grassy or scrub, usually behind low boundary walls, often with young trees. Madaan St is the emptiest/leafiest belt (mostly vacant plots, small roadside brick shrines). Sprinkle construction sites (brick stacks, sand piles, blue tarps, bamboo scaffolding) throughout.
- **Roads**: wide dusty asphalt, ~9-12m, no lane markings, dusty/sandy shoulders. Interlocking pavers in the W pocket (Main Chowk area) and red pavers on the La Regencia frontage. Junctions get yellow-black painted curbs. Zebra crossings rare (one near the water tank, one on the E extension belt).
- **Street furniture**: concrete power poles with transformers and heavy wire bundles; single-arm curved street lights (double-arm only on the bigger roads); green utility boxes; guard cabins at gates; occasional blue dumpster, cart vendor, or parked tractor-trolley. Parked cars/scooters along most lanes.
- **Green**: fenced pocket parks with black metal railings; mature neem/peepal canopies over older lanes; palms and manicured hedges in the upscale belts (C-Block Rd, Ansal Market Rd E extension, water-tank belt).

## Sub-districts (tone shifts worth modeling)
1. **La Regencia complex + frontage**: the only multi-tower apartment complex - 8-10fl white/light-grey towers with red+yellow accent balcony panels, red/grey panel boundary wall. Main gate on the W side facing E: red pillar, white guard cabin, boom barrier, red monolith sign, yellow-black speed bump. Red-paver frontage road, dusty construction belt and vacant plots just S of the gate.
2. **Upscale core** (C-Block Rd, St 2, Ansal Market Rd E + E extension, water-tank belt): premium 3fl builder floors - grey stone cladding, dark wood-slat gates, pergola roofs, cobble/paver aprons, manicured lawns, palm rows, blue-glass column accents.
3. **Madaan St belt**: quiet, tree-lined, mostly vacant grassy plots with boundary walls and small brick shrines. Low-traffic lanes.
4. **Main Chowk / W pocket**: older fabric mixed with new - cream 2fl houses with balcony rails and peeling paint next to modern 3fl; interlocking-paver roads; heavy tree canopy, dappled shade; fenced pocket park with bench. Main Chowk junction itself @29.42632,76.98715.
5. **F-Block Rd / N edge**: wider and dustier, more u/c exposed-brick 3-4fl, treed vacant plots, cart vendors. Anchored by the rainbow-striped school campus and water tank #2.
6. **South of 29.427 (SOUTH SQUAD's, recorded for handoff)**: visibly older plotted colony - painted wall ads (e.g. \"S.D. VIDYA MANDIR\"), narrow dusty lanes, weathered 2-3fl, kirana shops, cows, tractor trolleys. Distinct sub-character; don't blend it into the modern core.

## Landmarks to place (all pano-verified, coordinates in the JSON)
- La Regencia towers (orientation landmark, visible from most of the district) + red-pillar main gate
- White multi-shikhar temple @29.42990,76.98662 (red flags at the entrance)
- Mushroom-roof overhead water tank @29.42935,76.98710; second tank @29.43319,76.98927
- Cream arch gate monument over Ansal Market Rd @~29.43047,76.9835
- Roundabout with central decorative column @29.43040,76.98512 (Millennium School Rd x Ansal Market Rd)
- Rainbow-striped school campus (red/yellow/blue horizontal stripes, yellow bus, long beige/red boundary wall) @~29.4326-29.4334 x 76.9835-76.9842 - likely KR Mangalam World School, name unverified
- Two blue-glass office buildings @29.43154,76.98436 (with flag + barrier gate) and @29.42725,76.98621
- White/red 6-8fl towers @29.43094,76.98501; white 5-6fl apartment @29.4317,76.9880

## Street naming (from Google's own labels; OSM has no names here)
La Regencia Rd (diagonal SE->NW, carries the temple + water tank); Ansal Market Rd (E-W @29.4300-29.4305, arch gate + commercial blocks); Millennium School Rd (N-S @76.985, school building ~29.4297,76.9855); Tushar Villa Rd (N-S @76.9850-76.9855, N belt); C-Block Rd (N-S @76.9906; G-Block Rd alias at N end); F-Block Rd (E-W @29.4323; Achievers Point Rd alias @76.9885); Mauli St (E-W @29.4272); St 1 (@29.4278); St 2 (@29.42825); Madaan St (@29.4289); St 3 (N-S @76.9894); St 4 (N-S @76.98996 - uncovered, labels only); DPS Jr. St (diagonal @76.9863-76.9873); Main Chowk (junction @29.42632,76.98715).

## Cautions
- Imagery is uniformly June 2023; overcast frames mid-chain are multi-day capture, not a different era.
- Dewan Hospital is NOT positively located (no readable signage). Best candidates in the JSON's `unresolved` section - commercial belt near the arch gate fits its \"SCO 7\" address.
- St 4 and the La Regencia loop interior lanes have no street-level imagery: keep them generic or leave to a later pass.
