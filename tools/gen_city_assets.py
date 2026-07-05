# -*- coding: utf-8 -*-
"""Generate all assets for the Madrid, Lima and Jonkoping levels using
Google Nano Banana Pro (gemini-3-pro-image-preview, falling back to
gemini-2.5-flash-image): backgrounds, platform tiles, enemies, bosses,
NPC stands and NPC character sheets.

Usage:
  python tools/gen_city_assets.py          # everything missing
  python tools/gen_city_assets.py bg       # one category: bg|tiles|enemies|bosses|stands|chars
"""
import base64
import os
import sys
import time

import requests
from PIL import Image

from gen_sheets import ASSETS, KEYS, RAW, STYLE, key_magenta, slice_sheet

GEMINI_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image"]


def gemini_image(prompt, aspect="16:9"):
    key = KEYS["GEMINI_API_KEY"]
    last = None
    for model in GEMINI_MODELS:
        url = ("https://generativelanguage.googleapis.com/v1beta/models/"
               f"{model}:generateContent?key={key}")
        for body in (
            {"contents": [{"parts": [{"text": prompt}]}],
             "generationConfig": {"imageConfig": {"aspectRatio": aspect}}},
            {"contents": [{"parts": [{"text": prompt}]}]},   # no-config retry
        ):
            for attempt in range(3):
                r = requests.post(url, json=body, timeout=300)
                if r.status_code in (429, 500, 503):
                    time.sleep(20 * (attempt + 1))
                    continue
                break
            if r.status_code != 200:
                last = f"{model}: {r.status_code} {r.text[:140]}"
                continue
            for part in r.json()["candidates"][0]["content"]["parts"]:
                data = part.get("inlineData") or part.get("inline_data")
                if data:
                    print(f"    via {model}")
                    return base64.b64decode(data["data"])
            last = f"{model}: no image in response"
    raise RuntimeError(f"Gemini failed: {last}")


MAGENTA = ("Solid uniform pure magenta (#FF00FF) background everywhere, "
           "no text, no labels, no borders, no shadows.")

BGS = {
    "bg_madrid": ("A 2D side-scrolling video game background: Madrid Spain at "
                  "golden evening, the Plaza Mayor arcades and Habsburg spires, "
                  "grand terracotta rooftops, the Gran Via tower silhouettes "
                  "behind, warm orange sky. Wide landscape, layered depth for "
                  "parallax, no people, no text"),
    "bg_lima":   ("A 2D side-scrolling video game background: Lima Peru, "
                  "colonial old town with yellow plaster facades and ornate "
                  "dark wooden balconies, cathedral towers, misty grey-blue "
                  "coastal sky over the Pacific ocean cliffs in the distance. "
                  "Wide landscape, layered depth for parallax, no people, no text"),
    "bg_jonkoping": ("A 2D side-scrolling video game background: Jonkoping "
                     "Sweden on lake Vattern, wooden lakeside houses and a "
                     "white church spire, birch trees, long wooden piers on "
                     "calm blue water, soft Nordic summer evening sky. Wide "
                     "landscape, layered depth for parallax, no people, no text"),
}

TILES = {
    "tile_madrid": ("A long horizontal 2D side-view game platform: a Madrid "
                    "stone balcony ledge of warm granite blocks with an ornate "
                    "black wrought-iron railing on top, seen exactly from the "
                    "side, spanning the full image width, uniform height, "
                    "repeatable/tileable horizontally"),
    "tile_lima":   ("A long horizontal 2D side-view game platform: a Peruvian "
                    "colonial carved dark-wood balcony ledge over yellow "
                    "plaster, seen exactly from the side, spanning the full "
                    "image width, uniform height, repeatable/tileable "
                    "horizontally"),
    "tile_jonkoping": ("A long horizontal 2D side-view game platform: a Swedish "
                       "lakeside wooden pier ledge of weathered grey planks "
                       "with mooring rope and small white flowers on top, seen "
                       "exactly from the side, spanning the full image width, "
                       "uniform height, repeatable/tileable horizontally"),
}

ENEMIES = {
    "matador":  ("a proud spanish matador warrior enemy with a red cape, gold-"
                 "embroidered black traje de luces and a thin sword, confident "
                 "fighting stance"),
    "toro":     ("a huge angry black fighting bull enemy with glowing red eyes "
                 "and steam from its nostrils, head lowered to charge"),
    "pirata":   ("a ghostly pirate enemy of the port of Callao, tattered coat, "
                 "tricorn hat, glowing green spectral cutlass, menacing grin"),
    "pelicano": ("a demonic giant peruvian pelican enemy with dark storm-grey "
                 "feathers, glowing yellow eyes and a huge sharp beak, wings "
                 "spread in flight"),
    "vittra":   ("a swedish vittra forest wraith enemy, a gaunt grey-skinned "
                 "spirit warrior in moss-covered rags with birch-branch antlers "
                 "and glowing pale eyes"),
    "huldra":   ("a swedish huldra forest witch enemy, beautiful woman with a "
                 "fox tail and a hollow bark back, crown of pine twigs, casting "
                 "a glowing blue orb"),
}

BOSSES = {
    "boss_madrid": ("a huge boss monster: EL TORO DE BRONCE, a giant living "
                    "bronze bull minotaur statue from a Madrid plaza, glowing "
                    "molten cracks in its metal body, massive horns and a "
                    "two-handed axe"),
    "boss_lima":   ("a huge boss monster: KON the ancient peruvian sea god, a "
                    "towering water spirit with a golden Paracas mask, body of "
                    "swirling ocean waves and foam, holding a trident of coral"),
    "boss_jonkoping": ("a huge boss monster: VATTERNODJURET the lake Vattern "
                       "serpent, a giant nordic water dragon rising in coils, "
                       "dark green scales, pale glowing eyes and fins like a "
                       "viking ship prow"),
}

STANDS = {
    "npc_madrid_stall_0": ("A spanish churros street stall for a 2D game: a "
                           "small dark-green painted cart with brass fryer, "
                           "golden churros in paper cones, a cup of thick hot "
                           "chocolate, striped red-white awning and a sign "
                           "reading CHURRERIA. EMPTY stall, absolutely NO "
                           "people, NO humans"),
    "npc_lima_stall_0":   ("A peruvian ceviche street cart for a 2D game: a "
                           "white and blue wooden cart with a glass case of "
                           "fresh fish, bowls of ceviche with red onion and "
                           "sweet potato, limes, a small Peruvian flag and a "
                           "hand-painted sign reading CEVICHERIA. EMPTY cart, "
                           "absolutely NO people, NO humans"),
    "npc_jonkoping_stall_0": ("A swedish polkagris candy stand for a 2D game: "
                              "a cosy red wooden kiosk with white trim, jars of "
                              "red-and-white striped polkagris candy canes, "
                              "cinnamon buns on a plate, a small Swedish flag "
                              "and a sign reading POLKAGRIS. EMPTY stand, "
                              "absolutely NO people, NO humans"),
}

CHARS = {
    "madrid": {
        "desc": ("a warm-hearted spanish churros vendor woman with dark hair "
                 "in a low bun, small gold earrings, white blouse, red apron "
                 "and a long dark skirt"),
        "actions": (
            "Row 1: poses 1-2 = idle, standing smiling with hands on her apron "
            "(weight shifting slightly between frames); poses 3-4 = frying "
            "churros, lowering a churro dough ring into a small brass fryer "
            "with tongs (tongs at two heights). "
            "Row 2: poses 5-6 = offering a paper cone full of golden churros "
            "toward the viewer (cone slightly lower then higher); poses 7-8 = "
            "waving in greeting with one raised hand (hand at two heights)."),
        "sets": ["idle", "fry", "serve", "wave"],
    },
    "lima": {
        "desc": ("a cheerful peruvian cevichero man with short black hair, a "
                 "small moustache, white chef jacket, blue apron and a white "
                 "paper hat"),
        "actions": (
            "Row 1: poses 1-2 = idle, standing proud with arms crossed (weight "
            "shifting slightly between frames); poses 3-4 = squeezing a lime "
            "over a big glass bowl of ceviche on a small table (hands at two "
            "positions). "
            "Row 2: poses 5-6 = offering a bowl of ceviche toward the viewer "
            "(bowl slightly lower then higher); poses 7-8 = waving in greeting "
            "with one raised hand (hand at two heights)."),
        "sets": ["idle", "chop", "serve", "wave"],
    },
    "jonkoping": {
        "desc": ("a jolly swedish candy maker man with round glasses, a blond "
                 "moustache, white shirt with rolled sleeves, red-and-white "
                 "striped apron and a small paper hat"),
        "actions": (
            "Row 1: poses 1-2 = idle, standing happy with hands behind his "
            "back (weight shifting slightly between frames); poses 3-4 = "
            "rolling a long red-and-white polkagris candy rope on a small "
            "wooden table (hands at two positions). "
            "Row 2: poses 5-6 = offering a striped candy cane toward the "
            "viewer (cane slightly lower then higher); poses 7-8 = waving in "
            "greeting with one raised hand (hand at two heights)."),
        "sets": ["idle", "roll", "serve", "wave"],
    },
}


def char_sheet_prompt(desc, actions_text):
    return (f"A video game character sprite sheet: EXACTLY 8 poses of the SAME "
            f"character, arranged in a strict grid of 2 rows and 4 columns with "
            f"clear empty spacing between every pose. {MAGENTA} The character "
            f"is {desc}, identical face, outfit and body size in every pose, "
            f"full body visible, side view facing RIGHT. Poses come in pairs: "
            f"each pair is TWO consecutive animation frames of the same action "
            f"with only a small natural movement between them. {actions_text} "
            f"{STYLE}")


def want(name):
    return not os.path.exists(os.path.join(ASSETS, name + ".png"))


def fetch_raw(name, prompt, aspect):
    raw = os.path.join(RAW, name + ".png")
    if not os.path.exists(raw):
        print(f"[gen ] {name}")
        with open(raw, "wb") as f:
            f.write(gemini_image(prompt, aspect))
    return raw


def gen_bgs():
    for name, desc in BGS.items():
        if not want(name):
            print(f"[skip] {name}")
            continue
        raw = fetch_raw(name, f"{desc}. {STYLE}", "16:9")
        img = Image.open(raw).convert("RGB")
        if img.width > 1536:
            img = img.resize((1536, int(img.height * 1536 / img.width)),
                             Image.LANCZOS)
        img.save(os.path.join(ASSETS, name + ".png"))
        print(f"       -> {name}.png {img.size}")


def gen_tiles():
    for name, desc in TILES.items():
        if not want(name):
            print(f"[skip] {name}")
            continue
        raw = fetch_raw(name, f"{desc}. Solid uniform pure magenta (#FF00FF) "
                              f"background above and below the platform, "
                              f"nothing else, no text. {STYLE}", "16:9")
        img = key_magenta(Image.open(raw))
        bb = img.getbbox()
        if bb:
            img = img.crop(bb)
        if img.width > 1024:
            img = img.resize((1024, max(1, int(img.height * 1024 / img.width))),
                             Image.LANCZOS)
        img.save(os.path.join(ASSETS, name + ".png"))
        print(f"       -> {name}.png {img.size}")


def gen_sprite_group(group, extra, aspect="1:1", max_h=None):
    for name, desc in group.items():
        if not want(name):
            print(f"[skip] {name}")
            continue
        raw = fetch_raw(name, f"{desc}. {extra} {MAGENTA} {STYLE}", aspect)
        img = key_magenta(Image.open(raw))
        bb = img.getbbox()
        if bb:
            img = img.crop(bb)
        if max_h and img.height > max_h:
            img = img.resize((max(1, int(img.width * max_h / img.height)),
                              max_h), Image.LANCZOS)
        img.save(os.path.join(ASSETS, name + ".png"))
        print(f"       -> {name}.png {img.size}")


def gen_chars():
    for level, cfg in CHARS.items():
        frame_names = [f"npc_{level}_{s}_{i}" for s in cfg["sets"] for i in (0, 1)]
        if all(not want(n) for n in frame_names):
            print(f"[skip] chars {level}")
            continue
        raw = fetch_raw(f"sheet_npc_{level}",
                        char_sheet_prompt(cfg["desc"], cfg["actions"]), "16:9")
        sheet = key_magenta(Image.open(raw))
        pieces = slice_sheet(sheet, frame_names)
        s = 400 / max(p.height for p in pieces)
        for n, piece in zip(frame_names, pieces):
            piece = piece.resize((max(1, int(piece.width * s)),
                                  max(1, int(piece.height * s))), Image.LANCZOS)
            piece.save(os.path.join(ASSETS, n + ".png"))
            print(f"       -> {n}.png  {piece.size}")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only in (None, "bg"):
        gen_bgs()
    if only in (None, "tiles"):
        gen_tiles()
    if only in (None, "enemies"):
        gen_sprite_group(ENEMIES, "A single video game enemy character, full "
                         "body visible, side view facing RIGHT.")
    if only in (None, "bosses"):
        gen_sprite_group(BOSSES, "A single huge video game boss character, "
                         "full body visible, side view facing RIGHT.")
    if only in (None, "stands"):
        gen_sprite_group(STANDS, "A single object seen exactly from the side.",
                         max_h=500)
    if only in (None, "chars"):
        gen_chars()
    print("done")


if __name__ == "__main__":
    main()
