# Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
# Generates the male + female mannequins from MakeHuman CC0 assets using the
# MPFB Blender extension (GPL tool, CC0 output; only the output ships).
#
#   blender -b --factory-startup --python scripts/make_mannequins.py -- <out_dir>
import sys, json, math
import bpy
from mathutils import Vector, Quaternion

out_dir = sys.argv[sys.argv.index("--") + 1]

try:
    from bl_ext.blender_org.mpfb.services.humanservice import HumanService
    from bl_ext.blender_org.mpfb.services.targetservice import TargetService
except ImportError:
    from mpfb.services.humanservice import HumanService
    from mpfb.services.targetservice import TargetService

TRIS = 14000  # target triangle count per body (web-friendly)

def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

def align_bone(arm_obj, name, target_dir):
    pb = arm_obj.pose.bones.get(name)
    if pb is None:
        return False
    bpy.context.view_layer.update()
    head = arm_obj.matrix_world @ pb.head
    tail = arm_obj.matrix_world @ pb.tail
    cur = (tail - head).normalized()
    q_world = cur.rotation_difference(Vector(target_dir).normalized())
    # convert world rotation to pose-bone local space
    m = (arm_obj.matrix_world @ pb.matrix).to_quaternion()
    local = m.inverted() @ q_world @ m
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = local @ pb.rotation_quaternion
    bpy.context.view_layer.update()
    return True

meta = {}
for label, gender in (("female", 0.0), ("male", 1.0)):
    clear()
    macro = TargetService.get_default_macro_info_dict()
    macro["gender"] = gender
    macro["muscle"] = 0.5
    macro["weight"] = 0.5
    macro["proportions"] = 0.5
    body = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
    TargetService.bake_targets(body)
    HumanService.add_builtin_rig(body, "default", import_weights=True)
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    names = [b.name for b in rig.pose.bones]
    # T-pose: upper + lower arms + hands straight out along +/-X (Blender: -Y is front, Z up)
    for side, sx in (("L", 1.0), ("R", -1.0)):
        for b in ("upperarm01", "upperarm02", "lowerarm01", "lowerarm02", "wrist"):
            n = f"{b}.{side}"
            if n in names:
                align_bone(rig, n, (sx, 0.0, 0.0))
    bpy.ops.object.mode_set(mode="OBJECT")
    # apply modifiers (mask helpers + armature pose) into the mesh
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    for mod in list(body.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception as e:
            print("modifier", mod.name, e)
    bpy.data.objects.remove(rig, do_unlink=True)
    # strip everything except the skin surface
    if body.data.shape_keys:
        body.shape_key_clear()
    for vg in list(body.vertex_groups):
        body.vertex_groups.remove(vg)
    tri_now = sum(len(p.vertices) - 2 for p in body.data.polygons)
    dec = body.modifiers.new("dec", "DECIMATE")
    dec.ratio = min(1.0, TRIS / max(1, tri_now))
    bpy.ops.object.modifier_apply(modifier="dec")
    bpy.ops.object.shade_smooth()
    for m in list(body.data.materials):
        body.data.materials.clear()
    # landmarks (Blender Z-up; exported glTF is Y-up, -Y front -> +Z front)
    vs = [body.matrix_world @ v.co for v in body.data.vertices]
    zmax = max(v.z for v in vs)
    def band(z0, z1):
        sel = [v for v in vs if z0 <= v.z <= z1 and abs(v.x) < 0.25]
        return sel
    def width_at(z, tol=0.01):
        s = [v for v in vs if abs(v.z - z) < tol]
        return (max(v.x for v in s) - min(v.x for v in s), max(v.y for v in s) - min(v.y for v in s)) if s else (0, 0)
    arm_vs = [v for v in vs if abs(v.x) > 0.35]
    arm_z = sum(v.z for v in arm_vs) / max(1, len(arm_vs))
    meta[label] = {
        "height": zmax,
        "armZ": arm_z,
        "armSpan": max(v.x for v in vs) - min(v.x for v in vs),
        "tris": sum(len(p.vertices) - 2 for p in body.data.polygons),
    }
    bpy.ops.export_scene.gltf(filepath=f"{out_dir}/mannequin-{label}.glb", export_format="GLB", use_selection=True, export_apply=True, export_normals=True, export_texcoords=False, export_materials="NONE", export_skins=False, export_animations=False, export_morph=False, export_attributes=False)
    print("DONE", label, meta[label])

with open(f"{out_dir}/mannequins.meta.json", "w") as f:
    json.dump(meta, f, indent=1)
