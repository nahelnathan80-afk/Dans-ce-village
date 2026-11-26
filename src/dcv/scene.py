"""Briques de base Blender : matériaux, blocs biseautés (style jeu de
construction, sans tenons ni marque), plans texturés, panneaux face caméra.
Utilisé par les décors, les personnages et les accessoires.
"""
import math
from pathlib import Path

import bmesh
import bpy

_mesh_cache = {}
_mat_cache = {}


def hex_rgb(c):
    if isinstance(c, (list, tuple)):
        return tuple(c[:3])
    c = c.lstrip("#")
    srgb = [int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # sRGB → linéaire (Blender travaille en linéaire)
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in srgb)


def reset_caches():
    _mesh_cache.clear()
    _mat_cache.clear()
    _pattern_cache.clear() if "_pattern_cache" in globals() else None


def material(color, rough=0.6, emit=0.0, name=None, unique=False, metal=0.0):
    """Matériau Principled simple (couleur unie, un peu plastique)."""
    key = (str(color), rough, emit, metal)
    if not unique and key in _mat_cache:
        return _mat_cache[key]
    m = bpy.data.materials.new(name or f"M_{str(color)}")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    rgb = hex_rgb(color)
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit > 0:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*rgb, 1)
    if not unique:
        _mat_cache[key] = m
    return m


def image_material(img_path, emit=0.0, alpha=True, name=None, sequence_frames=0, rough=0.7):
    """Matériau à texture d'image (PNG avec transparence possible).
    sequence_frames > 0 : la texture est une séquence f_0001.png, f_0002.png…"""
    m = bpy.data.materials.new(name or f"IMG_{Path(img_path).stem}")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    img = bpy.data.images.load(str(img_path), check_existing=False)
    tex.image = img
    tex.interpolation = "Linear"
    tex.extension = "CLIP"
    if sequence_frames:
        img.source = "SEQUENCE"
        u = tex.image_user
        u.frame_duration = sequence_frames
        u.frame_start = 1
        u.frame_offset = 0
        u.use_auto_refresh = True
        u.use_cyclic = False
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    if alpha:
        nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
        m.surface_render_method = "BLENDED"
        m.use_transparency_overlap = False
    b.inputs["Roughness"].default_value = rough
    if emit > 0:
        nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emit
    return m


def _box_mesh(sx, sy, sz, bevel):
    key = (round(sx, 4), round(sy, 4), round(sz, 4), bevel)
    if key in _mesh_cache:
        return _mesh_cache[key]
    me = bpy.data.meshes.new("box")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    if bevel > 0:
        w = min(bevel, sx * 0.3, sy * 0.3, sz * 0.3)
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=w, segments=1, affect="EDGES", profile=0.5)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    _mesh_cache[key] = me
    return me


def box(name, size, loc=(0, 0, 0), color="#cccccc", rot=(0, 0, 0), parent=None, bevel=0.02,
        mat=None, origin="center", coll=None):
    """Bloc biseauté. origin='bottom' : loc désigne le centre de la face du bas."""
    sx, sy, sz = size
    me = _box_mesh(sx, sy, sz, bevel)
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    x, y, z = loc
    if origin == "bottom":
        z += sz / 2
    ob.location = (x, y, z)
    ob.rotation_euler = rot
    if mat is None:
        mat = material(color)
    if len(me.materials) == 0:      # maillage partagé : matériau porté par l'objet
        me.materials.append(mat)
    ob.material_slots[0].link = "OBJECT"
    ob.material_slots[0].material = mat
    if parent is not None:
        ob.parent = parent
    return ob


def cylinder(name, r, h, loc, color, parent=None, verts=12, mat=None, coll=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=h)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    ob.location = (loc[0], loc[1], loc[2] + h / 2)
    me.materials.append(mat or material(color))
    if parent is not None:
        ob.parent = parent
    return ob


def empty(name, loc=(0, 0, 0), parent=None, coll=None):
    ob = bpy.data.objects.new(name, None)
    (coll or bpy.context.scene.collection).objects.link(ob)
    ob.location = loc
    ob.empty_display_size = 0.1
    if parent is not None:
        ob.parent = parent
    return ob


def plane(name, w, h, loc, mat, rot=(math.pi / 2, 0, 0), parent=None, coll=None):
    """Plan rectangulaire w×h. Par défaut vertical, face visible vers -Y
    (c'est-à-dire vers la caméra « de face »)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x * w / 2, y * h / 2, 0)) for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    f = bm.faces.new(verts)
    uv = bm.loops.layers.uv.new()
    for loop, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uv].uv = (u, v)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    me.materials.append(mat)
    if parent is not None:
        ob.parent = parent
    return ob


def billboard(ob, cam):
    """Le plan se tourne toujours vers la caméra (copie de sa rotation)."""
    c = ob.constraints.new("COPY_ROTATION")
    c.target = cam


def look_at_euler(loc, target, roll=0.0):
    """Rotation d'une caméra placée en loc et visant target."""
    from mathutils import Vector
    d = Vector(target) - Vector(loc)
    q = d.to_track_quat("-Z", "Y")
    e = q.to_euler()
    if roll:
        from mathutils import Matrix
        m = q.to_matrix().to_4x4() @ Matrix.Rotation(roll, 4, "Z")
        e = m.to_euler()
    return e


_pattern_cache = {}


def pattern_material(motif, base, accent=None, unique=False):
    """Tissu à motif (fleurs, rayures, pois) projeté en « boîte » : pas besoin d'UV."""
    key = (motif, str(base), str(accent))
    if not unique and key in _pattern_cache:
        return _pattern_cache[key]
    import tempfile
    from PIL import Image, ImageDraw
    import random as _r
    W = 256
    rgb = lambda c: tuple(int(c.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    im = Image.new("RGB", (W, W), rgb(base))
    d = ImageDraw.Draw(im)
    rng = _r.Random(3)
    if motif == "fleurs":
        cols = [rgb(accent)] if accent else [(255, 214, 10), (255, 255, 255), (255, 90, 120), (120, 220, 255)]
        for _ in range(14):
            x, y = rng.randint(0, W), rng.randint(0, W)
            c = rng.choice(cols)
            for a in range(5):
                import math as _m
                px, py = x + 16 * _m.cos(a * 1.256), y + 16 * _m.sin(a * 1.256)
                d.ellipse([px - 11, py - 11, px + 11, py + 11], fill=c)
            d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(255, 170, 0))
        for _ in range(10):
            x, y = rng.randint(0, W), rng.randint(0, W)
            d.ellipse([x - 12, y - 5, x + 12, y + 5], fill=(40, 160, 90))
    elif motif == "rayures":
        for k in range(0, W, 42):
            d.rectangle([0, k, W, k + 16], fill=rgb(accent or "#ffffff"))
    elif motif == "pois":
        for yy in range(0, W, 48):
            for xx in range(0, W, 48):
                d.ellipse([xx + 14, yy + 14, xx + 30, yy + 30], fill=rgb(accent or "#ffffff"))
    path = Path(tempfile.gettempdir()) / f"dcv_motif_{motif}_{str(base).strip('#')}_{str(accent).strip('#')}.png"
    im.save(path)
    m = bpy.data.materials.new(f"MOTIF_{motif}")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (2.2, 2.2, 2.2)
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(path), check_existing=True)
    tex.projection = "BOX"
    tex.projection_blend = 0.25
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.7
    m.diffuse_color = (*hex_rgb(base), 1)
    if not unique:
        _pattern_cache[key] = m
    return m
