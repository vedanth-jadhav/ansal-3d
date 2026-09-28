"""Asset validation for the Ansal 3D Blender pipeline (docs/ASSET-PIPELINE.md).

Checks one authored asset scene (opened .blend, or imported .glb for audit):
  1. exactly one root object (parent-less mesh/empty/armature)
  2. scale sanity: world-space max dimension under the per-kit limit
  3. origin at ground: LOD0 min world-Z within 2 cm of 0
  4. clean transforms: root unrotated, all asset scales applied (Y-up safe)
  5. collision proxy: exactly one <name>_col mesh with < 300 tris
  6. material count <= 3 across LOD0 meshes
  7. texture paths: every used image packed or resolving beside the file
  8. LOD1 object (<name>_LOD1) present

Headless use:
  blender --background assets_src/02-houses/house_x.blend \
    --python scripts/blender/validate_asset.py -- --kit houses

Prints PASS/FAIL per check with numbers; exits nonzero on any failure.
No addon dependencies; bpy only. Importable: from validate_asset import check_scene.
"""
import sys

import bpy
from mathutils import Vector

MAX_DIM_M = {
    "roads": None, "houses": 60.0, "shop-houses": 60.0, "landmarks": 120.0,
    "street-furniture": 12.0, "vegetation": 25.0, "vehicles": 15.0,
    "characters": 2.5, "signage-decals": 12.0,
}
COL_TRI_LIMIT = 300
MAT_LIMIT = 3
GROUND_TOL_M = 0.02
ROOT_TYPES = {"MESH", "EMPTY", "ARMATURE"}


def asset_roots(scene=None):
    sc = scene or bpy.context.scene
    return [o for o in sc.objects if o.parent is None and o.type in ROOT_TYPES]


def subtree(root):
    out, stack = [], [root]
    while stack:
        o = stack.pop()
        out.append(o)
        stack.extend(o.children)
    return out


def lod0_meshes(root):
    return [o for o in subtree(root)
            if o.type == "MESH" and not o.name.endswith(("_col", "_LOD1"))]


def count_tris(obj):
    me = obj.data
    return sum(len(p.vertices) - 2 for p in me.polygons)


def world_bounds(objs):
    mn = Vector((1e9,) * 3)
    mx = Vector((-1e9,) * 3)
    n = 0
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, w))
            mx = Vector(map(max, mx, w))
            n += 1
    return mn, mx, n


def check_scene(kit="houses"):
    """Run all checks. Returns [(name, ok: bool, detail: str)]."""
    results = []
    roots = asset_roots()
    ok = len(roots) == 1
    results.append(("single-root", ok,
                    f"{len(roots)} root(s): {[r.name for r in roots]} (want 1)"))
    root = roots[0] if ok else None

    lod0 = lod0_meshes(root) if root else []
    col = [o for o in subtree(root) if o.name.endswith("_col")] if root else []
    lod1 = [o for o in subtree(root) if o.name.endswith("_LOD1")] if root else []

    # scale sanity
    limit = MAX_DIM_M.get(kit)
    if limit is None:
        results.append(("scale-sanity", True, f"kit '{kit}': tiled, n/a"))
        maxd = 0.0
    elif not lod0:
        results.append(("scale-sanity", False, "no LOD0 meshes to measure"));
        maxd = 0.0
    else:
        mn, mx, _ = world_bounds(lod0 + lod1)
        maxd = max(mx[i] - mn[i] for i in range(3))
        results.append(("scale-sanity", maxd <= limit,
                        f"max-dim {maxd:.2f}m vs limit {limit:.0f}m (kit {kit})"))

    # origin at ground
    if lod0:
        mn, _, _ = world_bounds(lod0)
        results.append(("origin-ground", abs(mn.z) <= GROUND_TOL_M,
                        f"LOD0 min-z {mn.z:.3f}m (tol ±{GROUND_TOL_M:.2f}m)"))
    else:
        results.append(("origin-ground", False, "no LOD0 meshes"))

    # clean transforms (Y-up proxy: root unrotated, scales applied)
    if root:
        import math
        r = root.rotation_euler
        rot_ok = all(abs(a) < 1e-3 for a in (r.x, r.y, r.z))
        bad_sc = [o.name for o in subtree(root) if o.type == "MESH"
                  and any(abs(s - 1.0) > 1e-3 for s in o.scale)]
        results.append(("clean-transforms", rot_ok and not bad_sc,
                        f"root-rot ({r.x:.3f},{r.y:.3f},{r.z:.3f}), "
                        f"unapplied-scale: {bad_sc or 'none'}"))
    else:
        results.append(("clean-transforms", False, "no root"))

    # collision proxy
    if len(col) == 1 and col[0].type == "MESH":
        t = count_tris(col[0])
        results.append(("collision-proxy", t < COL_TRI_LIMIT,
                        f"{col[0].name}: {t} tris (limit {COL_TRI_LIMIT})"))
    else:
        results.append(("collision-proxy", False,
                        f"{len(col)} *_col object(s): {[o.name for o in col]} (want 1 mesh)"))

    # material count
    mats = {m.name for o in lod0 for m in o.data.materials if m}
    results.append(("material-count", len(mats) <= MAT_LIMIT,
                    f"{len(mats)} material(s) {sorted(mats) or []} (limit {MAT_LIMIT})"))

    # texture paths
    missing, packed, total = [], 0, 0
    seen_imgs = {img for o in lod0 for m in o.data.materials if m
                 for n in (m.node_tree.nodes if m.use_nodes and m.node_tree else [])
                 if n.type == "TEX_IMAGE" and (img := n.image)}
    for img in seen_imgs:
        total += 1
        if img.packed_file:
            packed += 1
        elif not bpy.path.abspath(img.filepath) or \
                not __import__("os").path.exists(bpy.path.abspath(img.filepath)):
            missing.append(f"{img.name} -> '{img.filepath}'")
    results.append(("texture-paths", not missing,
                    f"{total} image(s), {packed} packed, "
                    f"missing: {missing or 'none'}"))

    # LOD1
    if lod1:
        t = sum(count_tris(o) for o in lod1 if o.type == "MESH")
        l0 = sum(count_tris(o) for o in lod0)
        results.append(("lod1-present", True,
                        f"{[o.name for o in lod1]}: {t} tris vs LOD0 {l0} tris"))
    else:
        results.append(("lod1-present", False, "no *_LOD1 object"))
    return results


def main(argv):
    kit = "houses"
    if "--kit" in argv:
        kit = argv[argv.index("--kit") + 1]
    results = check_scene(kit)
    print(f"== validate_asset: kit={kit} file={bpy.data.filepath or '(unsaved)'} ==")
    for name, passed, detail in results:
        print(f"[{'PASS' if passed else 'FAIL'}] {name}: {detail}")
    nfail = sum(1 for _, p, _ in results if not p)
    print(f"== {len(results) - nfail}/{len(results)} checks passed ==")
    if nfail:
        raise SystemExit(1)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    main(args)
