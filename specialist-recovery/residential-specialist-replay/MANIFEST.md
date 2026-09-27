# Residential parcel recovery for modular migration

This archive contains the actual compact tuple arrays recovered from the specialist's archived `districts.js` output, plus chronological source-edit commands. It does not contain the old source tree. The shell scripts are a reconstruction record, NOT safe to run blindly: they refer to lost /home/sandbox/v77 and /downloads catalog paths, mix one-off tests with edits, and depend on a different legacy districts.js layout. Port the JS routines into the modular branch, preserving its own imports, scene ownership and render lifecycle. Do not execute these scripts as a batch.

Catalog checked: byte-exact recovered v90r JSONL, SHA-256 ab2ee49dfb716c170128a8467952a3c443e4c5d00c07dba0dfd8a4523e69d0be, 1705 unique IDs. All 54 SN3/F and 43 C-Block IDs match their respective active scope in v90r; all coordinates match. The original SN3/F tuple array is v82 and has stale SN3S-013 vacant. Its v90r status is active: use the corrected array, which changes only that tuple to H, 3 levels, white tone. C-Block tuples were built at v85 and still match v90r coordinates and active statuses. Do not treat compact facade colors/forms as measured dimensions.

- `arrays/sn3-f-v82-original.js`: 54 compact parcel tuples exactly extracted from archived specialist output. Do not use unchanged against v90r.
- `arrays/sn3-f-v90r-corrected.js`: same 54 tuples, with the known SN3S-013 active status correction from the prior RC5 patch, suitable input for modular port.
- `arrays/c-block-v85.js`: 43 C-Block tuples exactly extracted from archived specialist output.
- `scripts/sn3-f/`: chronological shell edit records for the SN3/F renderer, culminating in v82 full-segment road mask. `021.sh` contains the full initial renderer generator. `066.sh` upgrades corner-only clearance to entire rectangle.
- `scripts/c-block/`: chronological shell edit records for C-Block renderer, culminating in v85 LOD and neighbor placement. `082.sh` contains the full initial renderer generator. `105.sh` applies per-cell LOD. Some intermediate scripts are superseded by later ones.

The scripts include historical names and comments from source data; they do not grant scope. Confirm against v90r and the rebuilt source. Render and walk QA is still required after porting, including road clearance, colliders, D Block ring draw calls, and full-body/solid-boundary collision.
