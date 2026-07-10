# -*- coding: utf-8 -*-
"""Generate minigame + Granada landmark assets.

- Dance-battle outfits (from the couple's fiesta photo): Samuel in white
  shirt + red sash + white shorts, Yossi in white ruffled blouse + long red
  skirt. One 8-pose sheet per hero, sliced into single frames.
- Granada landmark scenery sprites: Plaza del Triunfo monument, the green
  Las Titas kiosk, a blossoming Judas tree, and a Rio Genil embankment.

Usage:  python tools/gen_minigame_assets.py [dance|decor]
"""
import os
import sys

from PIL import Image

from gen_sheets import ASSETS, RAW, STYLE, key_magenta, slice_sheet
from gen_city_assets import MAGENTA, gemini_image

POSES = ["idle", "up", "left", "down", "right", "miss", "win", "spin"]

GREEN = ("Solid uniform pure bright green (#00FF00) chroma-key background "
         "everywhere, no text, no labels, no borders, no shadows.")


def key_green(img):
    """Chroma-key green — for subjects with pink/magenta content that the
    magenta keyer would eat (blossoms, pink water reflections)."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 130 and r < g * 0.62 and b < g * 0.62:
                px[x, y] = (0, 0, 0, 0)
            elif g > r + 70 and g > b + 70:      # de-spill fringe
                m = max(r, b)
                px[x, y] = (r, min(g, m + 90), b, a)
    return img

DANCERS = {
    "samuel": {
        "desc": ("a cheerful young Swedish man with shaggy blond hair and a "
                 "short reddish-blond beard, wearing a festive white "
                 "long-sleeved shirt, a bright red waist sash tied at the "
                 "hip, white knee-length shorts and black shoes"),
        "skirt": "",
    },
    "yossi": {
        "desc": ("a cheerful young Peruvian woman with long straight black "
                 "hair and a red flower above her ear, wearing a white "
                 "off-shoulder blouse with ruffled sleeves and a long "
                 "flowing bright red satin marinera skirt, black flat shoes"),
        "skirt": (" In the side-step poses she elegantly holds the hem of "
                  "her red skirt out to the side."),
    },
}


def dance_prompt(desc, skirt):
    return (
        "A video game character sprite sheet: EXACTLY 8 poses of the SAME "
        f"character, arranged in a strict grid of 2 rows and 4 columns with "
        f"clear empty spacing between every pose. {MAGENTA} The character is "
        f"{desc}, dancing a joyful Latin fiesta dance. CRITICAL: every pose "
        "shows the ENTIRE body from the top of the head down to the shoes - "
        "legs and both feet fully visible, NO waist-up, NO cropped poses. "
        "Identical face, outfit and body size in every pose, facing the "
        "viewer or side-on as described. "
        "Row 1: (1) relaxed dance-ready stance, feet together, snapping "
        "fingers; (2) both arms raised high overhead clapping, chest lifted; "
        "(3) big dance step to the LEFT, left arm swept out; (4) low crouch "
        "dance move, knees bent deep, hands on knees. "
        "Row 2: (5) big dance step to the RIGHT, right arm swept out; "
        "(6) off-balance stumble, arms flailing, embarrassed face; "
        "(7) triumphant flamenco finish pose, one arm curved high overhead, "
        "chin up; (8) mid-spin twirl with motion lines."
        f"{skirt} {STYLE}")


DECOR = {
    "deco_triunfo": (
        "A tall ornate white stone baroque monument column from Granada's "
        "Plaza del Triunfo: carved stone column on a wide stepped stone "
        "base, topped with a small golden statue of the Virgin, two elegant "
        "street lanterns beside the base and a low arc of small white "
        "fountain water jets in front. Single monument seen from the side"),
    "deco_kiosko": (
        "An ornate belle-epoque kiosk pavilion restaurant from Granada "
        "(Paseo del Salon): dark green wrought-iron and glass walls, "
        "elegant arched windows glowing warm from inside, a small golden "
        "dome on the roof, a couple of cream parasols beside it. Single "
        "building seen exactly from the side"),
}

# pink/white subjects clash with the magenta key -> green-screen these
DECOR_GREEN = {
    "deco_blossom": (
        "A blossoming Judas tree in full bloom: gnarled dark brown trunk "
        "and branches completely covered in vivid pink and magenta "
        "flowers, a few pink petals falling. Single tree seen from the "
        "side"),
    "deco_rio": (
        "A short stretch of the Rio Genil river walk in Granada: a low "
        "curved grey stone embankment wall with a black wrought-iron "
        "railing on top, a pale blue-white rushing river with small "
        "foaming rapids in front of it, and one leafy tree with autumn "
        "orange leaves behind. Wide low composition seen exactly from "
        "the side"),
}


def gen_dance():
    for hero, cfg in DANCERS.items():
        names = [f"{hero}_dance_{p}" for p in POSES]
        if all(os.path.exists(os.path.join(ASSETS, n + ".png")) for n in names):
            print(f"[skip] dance {hero}")
            continue
        raw = os.path.join(RAW, f"sheet_dance_{hero}.png")
        if not os.path.exists(raw):
            print(f"[gen ] dance sheet {hero}")
            with open(raw, "wb") as f:
                f.write(gemini_image(dance_prompt(cfg["desc"], cfg["skirt"]),
                                     "16:9"))
        sheet = key_magenta(Image.open(raw))
        pieces = slice_sheet(sheet, names)
        s = 400 / max(p.height for p in pieces)
        for n, piece in zip(names, pieces):
            piece = piece.resize((max(1, int(piece.width * s)),
                                  max(1, int(piece.height * s))), Image.LANCZOS)
            piece.save(os.path.join(ASSETS, n + ".png"))
            print(f"       -> {n}.png  {piece.size}")


def gen_decor():
    jobs = [(n, d, MAGENTA, key_magenta) for n, d in DECOR.items()] + \
           [(n, d, GREEN, key_green) for n, d in DECOR_GREEN.items()]
    for name, desc, bg, keyer in jobs:
        out = os.path.join(ASSETS, name + ".png")
        if os.path.exists(out):
            print(f"[skip] {name}")
            continue
        raw = os.path.join(RAW, name + ".png")
        if not os.path.exists(raw):
            print(f"[gen ] {name}")
            with open(raw, "wb") as f:
                f.write(gemini_image(
                    f"{desc}, for a 2D side-scrolling game. {bg} {STYLE}",
                    "1:1"))
        img = keyer(Image.open(raw))
        bb = img.getbbox()
        if bb:
            img = img.crop(bb)
        if img.height > 520:
            s = 520 / img.height
            img = img.resize((max(1, int(img.width * s)), 520), Image.LANCZOS)
        img.save(out)
        print(f"       -> {name}.png {img.size}")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only in (None, "dance"):
        gen_dance()
    if only in (None, "decor"):
        gen_decor()
    print("done")


if __name__ == "__main__":
    main()
