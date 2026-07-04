# -*- coding: utf-8 -*-
"""Generate character sprite SHEETS (all poses in one image) + terrain tiles.

One API call per hero yields 8 poses -> cheaper and size-consistent.
Tries GPT Images (gpt-image-1) first per user preference, falls back to
Gemini (nano banana). Slices the sheet via alpha-projection segmentation.

Usage:
  python tools/gen_sheets.py            # everything missing
  python tools/gen_sheets.py samuel     # one hero sheet
  python tools/gen_sheets.py tiles      # terrain tiles only
"""
import base64
import io
import json
import os
import sys
import time
import warnings

warnings.filterwarnings("ignore")
import requests            # noqa: E402
from PIL import Image      # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "tools", "raw")
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(RAW, exist_ok=True)

KEYS = {}
with open(os.path.join(ROOT, ".env"), encoding="utf-8") as f:
    for line in f:
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.strip().split("=", 1)
            KEYS[k] = v

STYLE = ("Retro 16-bit SNES-era video game art style, clean bold black outlines, "
         "vibrant saturated colors, cel shaded.")

SAMUEL_DESC = ("a cheerful young Swedish man hero with shaggy blond hair, short "
               "reddish-blond beard, blue eyes, wearing a cream/beige t-shirt, a blue "
               "bandana around his neck, grey cargo shorts, brown hiking boots and a "
               "small green backpack")
YOSSI_DESC = ("a cheerful young Peruvian woman hero with long straight black hair, "
              "wearing a bright lime-green t-shirt, khaki cargo pants, brown hiking "
              "boots and a small green backpack")

# sheet reading order: row-major
POSE_NAMES = ["slash", "slash2", "slash3", "crouch",
              "roll", "flip", "climb", "victory"]

POSE_TEXT = (
    "Row 1, left to right: "
    "(1) fast horizontal sword slash, blade sweeping forward; "
    "(2) rising diagonal sword slash from low to high; "
    "(3) huge two-handed overhead sword finisher smash with a glowing motion arc; "
    "(4) crouching very low on one knee, sword held ready. "
    "Row 2, left to right: "
    "(5) dodge roll: body curled into a tight tucked ball, motion lines around it; "
    "(6) mid-air double-jump somersault, backflip with knees tucked; "
    "(7) climbing a wooden ladder, gripping a rung above; "
    "(8) happy victory pose, fist raised to the sky."
)

def sheet_prompt(desc):
    return (f"A video game character sprite sheet: EXACTLY 8 poses of the SAME character, "
            f"arranged in a strict grid of 2 rows and 4 columns with clear empty spacing "
            f"between every pose. Solid uniform pure magenta (#FF00FF) background everywhere, "
            f"no grid lines, no text, no labels, no borders, no shadows. "
            f"The character is {desc}, identical face, outfit and body size in every pose, "
            f"full body visible, side view facing RIGHT. {POSE_TEXT} {STYLE}")

TILES = {
    "tile_granada": ("A long horizontal 2D side-view game platform: an Andalusian rooftop "
                     "ledge made of curved terracotta clay roof tiles over a white plaster "
                     "edge, seen exactly from the side, spanning the full image width, "
                     "uniform height, repeatable/tileable horizontally"),
    "tile_cusco":   ("A long horizontal 2D side-view game platform: an Inca stone terrace "
                     "ledge of perfectly fitted grey-brown polygonal masonry blocks with "
                     "grass tufts on top, seen exactly from the side, spanning the full "
                     "image width, uniform height, repeatable/tileable horizontally"),
    "tile_sweden":  ("A long horizontal 2D side-view game platform: a rustic Swedish wooden "
                     "ledge of weathered red-painted planks with moss and small wildflowers "
                     "on top, seen exactly from the side, spanning the full image width, "
                     "uniform height, repeatable/tileable horizontally"),
}


# ---------------- image backends ----------------
# newest first — user prefers the latest GPT image model
GPT_MODELS = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"]


def gpt_sheet(prompt, ref_path=None):
    """Latest available gpt-image model via edits (with ref) or generations."""
    key = KEYS.get("GPT_API_KEY")
    if not key:
        raise RuntimeError("no GPT key")
    headers = {"Authorization": f"Bearer {key}"}
    last_err = None
    for model in GPT_MODELS:
        try:
            if ref_path:
                with open(ref_path, "rb") as rf:
                    r = requests.post(
                        "https://api.openai.com/v1/images/edits", headers=headers,
                        files={"image[]": (os.path.basename(ref_path), rf, "image/png")},
                        data={"model": model, "prompt": prompt, "size": "1536x1024",
                              "quality": "high"},
                        timeout=300)
            else:
                r = requests.post(
                    "https://api.openai.com/v1/images/generations", headers=headers,
                    json={"model": model, "prompt": prompt, "size": "1536x1024",
                          "quality": "high"},
                    timeout=300)
            if r.status_code == 200:
                print(f"    using {model}")
                return base64.b64decode(r.json()["data"][0]["b64_json"])
            last_err = f"{model}: {r.status_code} {r.text[:160]}"
            # unknown model -> try the next one; other errors -> stop
            if r.status_code not in (400, 404) or "model" not in r.text.lower():
                break
        except OSError as e:
            last_err = f"{model}: {e}"
    raise RuntimeError(f"GPT {last_err}")


def gemini_sheet(prompt, ref_path=None):
    key = KEYS["GEMINI_API_KEY"]
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           f"gemini-2.5-flash-image:generateContent?key={key}")
    parts = [{"text": prompt}]
    if ref_path:
        with open(ref_path, "rb") as f:
            parts.append({"inline_data": {"mime_type": "image/png",
                                          "data": base64.b64encode(f.read()).decode()}})
    for attempt in range(4):
        r = requests.post(url, json={"contents": [{"parts": parts}]}, timeout=300)
        if r.status_code in (429, 500, 503):
            time.sleep(25 * (attempt + 1))
            continue
        r.raise_for_status()
        for part in r.json()["candidates"][0]["content"]["parts"]:
            data = part.get("inlineData") or part.get("inline_data")
            if data:
                return base64.b64decode(data["data"])
        raise RuntimeError("no image in Gemini response")
    raise RuntimeError("Gemini rate limited")


def make_image(prompt, ref_path=None, label=""):
    try:
        out = gpt_sheet(prompt, ref_path)
        print(f"    [{label}] via GPT Images")
        return out
    except Exception as e:
        print(f"    [{label}] GPT failed ({str(e)[:110]}) -> Gemini")
        return gemini_sheet(prompt, ref_path)


# ---------------- slicing ----------------
def key_magenta(img):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 130 and b > 130 and g < min(r, b) * 0.62:
                px[x, y] = (0, 0, 0, 0)
            elif r > g + 70 and b > g + 70:   # de-spill fringe
                m = g
                px[x, y] = (min(r, m + 90), g, min(b, m + 90), a)
    return img


def segments(sums, min_gap, min_size):
    """1-D runs of non-empty separated by gaps."""
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


def slice_sheet(sheet, names):
    """Segment by alpha projections; fall back to uniform grid."""
    a = sheet.getchannel("A")
    w, h = sheet.size
    data = list(a.getdata())
    rowsum = [0] * h
    for y in range(h):
        rowsum[y] = sum(1 for v in data[y * w:(y + 1) * w] if v > 20)
    rows = segments(rowsum, min_gap=6, min_size=40)
    boxes = []
    for (y0, y1) in rows:
        colsum = [0] * w
        for y in range(y0, y1 + 1):
            row = data[y * w:(y + 1) * w]
            for x in range(w):
                if row[x] > 20:
                    colsum[x] += 1
        for (x0, x1) in segments(colsum, min_gap=6, min_size=30):
            crop = sheet.crop((x0, y0, x1 + 1, y1 + 1))
            bb = crop.getbbox()
            if bb:
                crop = crop.crop(bb)
                if crop.width * crop.height > 2000:
                    boxes.append(crop)
    if len(boxes) != len(names):
        print(f"    projection found {len(boxes)} pieces, expected {len(names)} "
              f"-> uniform grid fallback")
        boxes = []
        cw, ch = w // 4, h // 2
        for r in range(2):
            for c in range(4):
                crop = sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
                bb = crop.getbbox()
                boxes.append(crop.crop(bb) if bb else crop)
    return boxes[:len(names)]


def gen_hero_sheet(hero, desc, ref):
    done = all(os.path.exists(os.path.join(ASSETS, f"{hero}_{n}.png"))
               for n in POSE_NAMES)
    if done:
        print(f"[skip] {hero} sheet")
        return
    print(f"[gen ] {hero} sheet (8 poses, 1 call)")
    raw = os.path.join(RAW, f"sheet_{hero}.png")
    if not os.path.exists(raw):
        data = make_image(sheet_prompt(desc), ref, label=hero)
        with open(raw, "wb") as f:
            f.write(data)
    sheet = key_magenta(Image.open(raw))
    pieces = slice_sheet(sheet, POSE_NAMES)
    # consistent scale: normalize so the tallest standing pose maps to 400px,
    # every other pose scaled by the SAME factor (keeps proportions).
    ref_h = max(p.height for p in pieces)
    s = 400 / ref_h
    for name, piece in zip(POSE_NAMES, pieces):
        piece = piece.resize((max(1, int(piece.width * s)),
                              max(1, int(piece.height * s))), Image.LANCZOS)
        out = os.path.join(ASSETS, f"{hero}_{name}.png")
        piece.save(out)
        print(f"       -> {hero}_{name}.png  {piece.size}")


def gen_tiles():
    for name, desc in TILES.items():
        out = os.path.join(ASSETS, name + ".png")
        if os.path.exists(out):
            print(f"[skip] {name}")
            continue
        print(f"[gen ] {name}")
        prompt = (f"{desc}. Solid uniform pure magenta (#FF00FF) background above and "
                  f"below the platform, nothing else, no text. {STYLE}")
        raw = os.path.join(RAW, name + ".png")
        if not os.path.exists(raw):
            with open(raw, "wb") as f:
                f.write(make_image(prompt, None, label=name))
        img = key_magenta(Image.open(raw))
        bb = img.getbbox()
        if bb:
            img = img.crop(bb)
        if img.width > 1024:
            s = 1024 / img.width
            img = img.resize((1024, max(1, int(img.height * s))), Image.LANCZOS)
        img.save(out)
        print(f"       -> {name}.png {img.size}")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only in (None, "samuel"):
        gen_hero_sheet("samuel", SAMUEL_DESC, os.path.join(ROOT, "player two samuel.png"))
    if only in (None, "yossi"):
        gen_hero_sheet("yossi", YOSSI_DESC, os.path.join(ROOT, "player one yossi.png"))
    if only in (None, "tiles"):
        gen_tiles()
    print("done")


if __name__ == "__main__":
    main()
