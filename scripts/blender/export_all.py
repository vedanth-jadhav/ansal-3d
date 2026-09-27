"""Batch-export assets_src/<kit>/*.blend -> assets/<kit>/*.glb + manifest.json.

Re-validates every asset via validate_asset.check_scene before export;
failed assets are skipped and reported, never silently shipped.

Usage (headless):
  blender --background --python scripts/blender/export_all.py -- --kit houses
  blender --background --python scripts/blender/export_all.py -- --all

Manifest field style mirrors public/accents/manifest.json
(name/category/file/source_url/license/author/bytes/triangles + extras).
Attribution per asset comes from an optional <asset>.meta.json beside the
.blend: {name, source_url, license, license_url, license_text_url, author}.
Without one the asset is recorded as original Ansal 3D work.
"""
import hashlib
import json
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from validate_asset import asset_roots, check_scene, count_tris, lod0_meshes, subtree

REPO = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(REPO, "assets_src")
DST = os.path.join(REPO, "assets")
ORIGINAL = {"source_url": "", "license": "Original work \u2014 Ansal 3D",
            "license_url": "", "license_text_url": "",
            "author": "Ansal 3D contributors"}
DISCLAIMER = ("Stylized street vignettes, not surveyed footprints; "
              "illustrative placement, not an as-built survey.")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def kit_order():
    with open(os.path.join(SRC, "kits.json")) as f:
        return [k["dir"].split("-", 1)[1] for k in json.load(f)]


def export_kit(kit):
    kdir = next(d for d in os.listdir(SRC)
                if d.split("-", 1)[1] == kit) if kit != "*" else None
    srcd = os.path.join(SRC, kdir)
    dstd = os.path.join(DST, kit)
    os.makedirs(dstd, exist_ok=True)
    blends = sorted(f for f in os.listdir(srcd) if f.endswith(".blend"))
    assets, failed = [], []
    for bf in blends:
        stem = bf[:-6]
        bpy.ops.wm.open_mainfile(filepath=os.path.join(srcd, bf))
        checks = check_scene(kit)
        bad = [n for n, p, _ in checks if not p]
        if bad:
            print(f"[SKIP] {bf}: failed {bad}")
            failed.append({"file": bf, "failed_checks": bad})
            continue
        root = asset_roots()[0]
        bpy.ops.object.select_all(action="DESELECT")
        for o in subtree(root):
            o.select_set(True)
        bpy.context.view_layer.objects.active = root
        out = os.path.join(dstd, stem + ".glb")
        bpy.ops.export_scene.gltf(filepath=out, export_format="GLB",
                                  use_selection=True, export_yup=True,
                                  export_materials="EXPORT")
        meta = dict(ORIGINAL)
        mp = os.path.join(srcd, stem + ".meta.json")
        if os.path.exists(mp):
            meta.update(json.load(open(mp)))
        deps = sorted({os.path.basename(bpy.path.abspath(n.image.filepath))
                       for o in lod0_meshes(root) for m in o.data.materials if m
                       for n in (m.node_tree.nodes if m.use_nodes and m.node_tree else [])
                       if n.type == "TEX_IMAGE" and n.image and not n.image.packed_file})
        assets.append({
            "name": meta.get("name", stem), "category": kit,
            "file": f"{kit}/{stem}.glb", "source_url": meta["source_url"],
            "license": meta["license"], "license_url": meta["license_url"],
            "license_text_url": meta["license_text_url"], "author": meta["author"],
            "bytes": os.path.getsize(out),
            "triangles": sum(count_tris(o) for o in lod0_meshes(root)),
            "dependencies": deps, "sha256": sha256(out)})
        print(f"[OK] {bf} -> {out}")
    manifest = {"kit": kit, "notes": [DISCLAIMER,
                f"{len(assets)} exported, {len(failed)} failed validation."],
                "assets": assets, "failed": failed}
    with open(os.path.join(dstd, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"== kit {kit}: {len(assets)} exported, {len(failed)} failed ==")
    return failed


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    kits = kit_order() if "--all" in args else [args[args.index("--kit") + 1]]
    fails = sum(len(export_kit(k)) for k in kits)
    raise SystemExit(1 if fails else 0)
