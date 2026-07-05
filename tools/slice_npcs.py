# -*- coding: utf-8 -*-
"""Slice tools/raw/'background sprites.png' (ambient NPC sheet) into assets.

The sheet has 3 rows of background characters, each row: a stall/scene image
plus labeled action groups. Arabic + Peruvian groups are 2-frame animations;
Swedish groups are single two-person scenes.

Outputs assets/npc_<level>_<name>_<frame>.png
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "tools", "raw", "background sprites.png")
ASSETS = os.path.join(ROOT, "assets")


def key_background(img):
    """Make everything close to the corner background color transparent."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    br, bg, bb, _ = px[w - 4, h - 4]     # sample bottom-right corner
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r - br) < 26 and abs(g - bg) < 26 and abs(b - bb) < 26:
                px[x, y] = (0, 0, 0, 0)
    return img


def segments(sums, min_gap, min_size):
    segs, start, gap = [], None, 0
    for i, v in enumerate(sums):
        if v > 0:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                if i - gap - start + 1 >= min_size:
                    segs.append((start, i - gap))
                start, gap = None, 0
    if start is not None and len(sums) - start >= min_size:
        segs.append((start, len(sums) - 1))
    return segs


def alpha_colsums(img):
    a = img.getchannel("A")
    w, h = img.size
    data = list(a.getdata())
    sums = [0] * w
    for y in range(h):
        row = data[y * w:(y + 1) * w]
        for x in range(w):
            if row[x] > 20:
                sums[x] += 1
    return sums


def alpha_rowsums(img):
    a = img.getchannel("A")
    w, h = img.size
    data = list(a.getdata())
    return [sum(1 for v in data[y * w:(y + 1) * w] if v > 20) for y in range(h)]


def strip_label(piece):
    """Remove the small yellow label text block at the top of a piece."""
    rs = alpha_rowsums(piece)
    segs = segments(rs, min_gap=3, min_size=4)
    # drop leading short segments (text lines are < 30 px tall)
    while len(segs) > 1 and segs[0][1] - segs[0][0] < 30:
        segs.pop(0)
    y0 = segs[0][0]
    piece = piece.crop((0, y0, piece.width, piece.height))
    bb = piece.getbbox()
    return piece.crop(bb) if bb else piece


def split_pair(piece):
    """Split a 2-frame group at the sparsest column near the middle."""
    sums = alpha_colsums(piece)
    w = piece.width
    lo, hi = int(w * 0.32), int(w * 0.68)
    cut = min(range(lo, hi), key=lambda x: sums[x])
    left = piece.crop((0, 0, cut, piece.height))
    right = piece.crop((cut, 0, w, piece.height))
    out = []
    for p in (left, right):
        bb = p.getbbox()
        out.append(p.crop(bb) if bb else p)
    return out


def slice_rows(img):
    rs = alpha_rowsums(img)
    rows = []
    for (y0, y1) in segments(rs, min_gap=8, min_size=100):
        band = img.crop((0, y0, img.width, y1 + 1))
        sums = alpha_colsums(band)
        pieces = []
        for (x0, x1) in segments(sums, min_gap=5, min_size=18):
            crop = band.crop((x0, 0, x1 + 1, band.height))
            bb = crop.getbbox()
            if bb:
                crop = crop.crop(bb)
                if crop.width * crop.height > 4000:
                    pieces.append(strip_label(crop))
        rows.append(pieces)
    return rows


# per row: piece index -> (name, mode)  mode: single | pair | pair_merged
PLAN = {
    0: ("granada", [("stall", "single"), ("idle", "pair"), ("pour", "pair"),
                    ("serve", "pair"), ("drink", "frameA"), ("drink", "frameB"),
                    ("wave", "pair"), ("clean", "frameA"), ("clean", "frameB"),
                    ("kettle", "single")]),
    1: ("cusco",   [("stall", "single"), ("idle", "pair"), ("welcome", "single"),
                    ("serve", "pair"), ("cook", "pair"), ("arrange", "pair"),
                    ("eat", "pair"), ("wipe", "pair")]),
    2: ("sweden",  [("stall", "single"), ("idle", "single"),
                    ("plan+saw", "pair"),      # two scenes merged in one piece
                    ("plane", "single"), ("hammer", "single"),
                    ("carry", "single"), ("approve", "single")]),
}


def main():
    img = key_background(Image.open(SHEET))
    rows = slice_rows(img)
    for ri, (level, plan) in PLAN.items():
        pieces = rows[ri]
        if len(pieces) != len(plan):
            raise SystemExit(f"row {ri}: expected {len(plan)} pieces, got {len(pieces)}")
        frames = {}      # name -> [images]
        for (name, mode), piece in zip(plan, pieces):
            if mode == "single":
                frames.setdefault(name, []).append(piece)
            elif mode == "pair":
                if "+" in name:                     # merged scenes -> separate anims
                    a, b = name.split("+")
                    pa, pb = split_pair(piece)
                    frames.setdefault(a, []).append(pa)
                    frames.setdefault(b, []).append(pb)
                else:
                    frames.setdefault(name, []).extend(split_pair(piece))
            else:                                   # frameA / frameB
                frames.setdefault(name, []).append(piece)
        for name, imgs in frames.items():
            for i, f in enumerate(imgs):
                out = os.path.join(ASSETS, f"npc_{level}_{name}_{i}.png")
                f.save(out)
                print(f"  -> npc_{level}_{name}_{i}.png  {f.size}")


if __name__ == "__main__":
    main()
