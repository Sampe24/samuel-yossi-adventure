# -*- coding: utf-8 -*-
"""Generate ambient NPC assets: one stall image per level (no people) and
character sheets (4 actions x 2 animation frames) sliced into separate
sprites. Replaces the old merged-scene NPC sprites.

Usage:
  python tools/gen_npc_sheets.py           # everything missing
  python tools/gen_npc_sheets.py stalls    # stall images only
  python tools/gen_npc_sheets.py chars     # character sheets only
"""
import os
import sys

from PIL import Image

from gen_sheets import ASSETS, RAW, STYLE, key_magenta, make_image, slice_sheet


def sheet_prompt(desc, actions_text):
    return (f"A video game character sprite sheet: EXACTLY 8 poses of the SAME "
            f"character, arranged in a strict grid of 2 rows and 4 columns with "
            f"clear empty spacing between every pose. Solid uniform pure magenta "
            f"(#FF00FF) background everywhere, no grid lines, no text, no labels, "
            f"no borders, no shadows. The character is {desc}, identical face, "
            f"outfit and body size in every pose, full body visible, side view "
            f"facing RIGHT. Poses come in pairs: each pair is TWO consecutive "
            f"animation frames of the same action with only a small natural "
            f"movement between them. {actions_text} {STYLE}")


STALLS = {
    "npc_granada_stall_0": (
        "An Arabic street tea stall for a 2D game: an ornate dark wooden cart "
        "with polished brass tea kettles and a samovar, small Turkish tea "
        "glasses, a patterned red oriental rug draped over the counter, a "
        "hanging brass lantern and a small wooden sign with Arabic calligraphy. "
        "EMPTY stall, absolutely NO people, NO humans"),
    "npc_cusco_stall_0": (
        "A Peruvian street food stand for a 2D game: a wooden market table "
        "covered with a colorful striped Andean textile cloth, bowls of stew "
        "and corn, fruit, glass bottles, a small Peruvian flag on a pole and a "
        "rustic wooden sign reading SABOR PERUANO. "
        "EMPTY stand, absolutely NO people, NO humans"),
    "npc_sweden_stall_0": (
        "A Swedish carpenter's outdoor workshop corner for a 2D game: a sturdy "
        "weathered wooden workbench with a hand saw, hammer, chisels, wood "
        "shavings and stacked pine planks, a small Swedish flag on a pole. "
        "EMPTY workshop, absolutely NO people, NO humans"),
}

CHARS = {
    "granada_owner": {
        "desc": ("a friendly middle-aged Arab tea vendor with a short black "
                 "beard, white turban, long cream-colored thobe robe, dark "
                 "green vest and brown sandals"),
        "actions": (
            "Row 1: poses 1-2 = idle, standing relaxed holding a small tea "
            "glass (weight shifting slightly between frames); poses 3-4 = "
            "pouring tea from a raised brass kettle into a glass on a small "
            "side table (kettle slightly higher then lower). "
            "Row 2: poses 5-6 = offering a tray with tea glasses toward the "
            "viewer (tray slightly lower then higher); poses 7-8 = waving in "
            "greeting with one raised hand (hand at two different heights)."),
        "sets": ["idle", "pour", "serve", "wave"],
    },
    "cusco_owner": {
        "desc": ("a cheerful Peruvian market woman with long black braids, a "
                 "wide-brimmed tan Andean hat, white embroidered blouse and a "
                 "colorful red patterned skirt"),
        "actions": (
            "Row 1: poses 1-2 = idle, standing smiling with hands clasped "
            "(weight shifting slightly between frames); poses 3-4 = stirring a "
            "big clay cooking pot on a small stand with a wooden spoon (spoon "
            "at two positions). "
            "Row 2: poses 5-6 = holding out a plate of food toward the viewer "
            "(plate slightly lower then higher); poses 7-8 = wiping her hands "
            "on a small white cloth (hands at two positions)."),
        "sets": ["idle", "cook", "serve", "wipe"],
    },
    "sweden_man": {
        "desc": ("a sturdy Swedish carpenter man with blond hair, a short "
                 "blond beard, blue work shirt, brown leather work apron, dark "
                 "trousers and work boots"),
        "actions": (
            "Row 1: poses 1-2 = idle, standing holding a hammer at his side "
            "(weight shifting slightly between frames); poses 3-4 = sawing a "
            "wooden plank resting on a low sawhorse (saw pushed forward then "
            "pulled back). "
            "Row 2: poses 5-6 = hammering a nail into a plank on a low stump "
            "(hammer raised high then striking down); poses 7-8 = carrying a "
            "long wooden plank over one shoulder while walking (legs in two "
            "different step positions)."),
        "sets": ["idle", "saw", "hammer", "carry"],
    },
    "sweden_woman": {
        "desc": ("a cheerful Swedish carpenter woman with blonde hair in a "
                 "bun, blue work shirt, brown leather work apron, dark "
                 "trousers and work boots"),
        "actions": (
            "Row 1: poses 1-2 = idle, standing holding a wooden mallet "
            "(weight shifting slightly between frames); poses 3-4 = planing a "
            "wooden plank on a low sawhorse with a hand plane (plane pushed "
            "forward then pulled back). "
            "Row 2: poses 5-6 = painting a small wooden birdhouse held in one "
            "hand with a brush (brush at two positions); poses 7-8 = happy "
            "thumbs-up approval pose admiring finished work (arm at two "
            "slightly different heights)."),
        "sets": ["idle", "plane", "paint", "approve"],
    },
}


def gen_stalls():
    for name, desc in STALLS.items():
        out = os.path.join(ASSETS, name + ".png")
        raw = os.path.join(RAW, name.replace("_0", "") + "2.png")
        if os.path.exists(out) and os.path.exists(raw):
            print(f"[skip] {name}")
            continue
        print(f"[gen ] {name}")
        prompt = (f"{desc}. A single object seen exactly from the side, solid "
                  f"uniform pure magenta (#FF00FF) background everywhere else, "
                  f"no other text, no borders. {STYLE}")
        if not os.path.exists(raw):
            with open(raw, "wb") as f:
                f.write(make_image(prompt, None, label=name))
        img = key_magenta(Image.open(raw))
        bb = img.getbbox()
        if bb:
            img = img.crop(bb)
        if img.height > 500:
            s = 500 / img.height
            img = img.resize((max(1, int(img.width * s)), 500), Image.LANCZOS)
        img.save(out)
        print(f"       -> {name}.png {img.size}")


def gen_chars():
    for char, cfg in CHARS.items():
        level, who = char.split("_")
        # asset set names: sweden gets man_/woman_ prefixes, others plain
        set_names = [f"{who}_{s}" if level == "sweden" else s
                     for s in cfg["sets"]]
        frame_names = [f"npc_{level}_{s}_{i}" for s in set_names for i in (0, 1)]
        if all(os.path.exists(os.path.join(ASSETS, n + ".png")) for n in frame_names):
            print(f"[skip] {char}")
            continue
        print(f"[gen ] {char} (8 frames, 1 call)")
        raw = os.path.join(RAW, f"sheet_npc_{char}.png")
        if not os.path.exists(raw):
            data = make_image(sheet_prompt(cfg["desc"], cfg["actions"]), None,
                              label=char)
            with open(raw, "wb") as f:
                f.write(data)
        sheet = key_magenta(Image.open(raw))
        pieces = slice_sheet(sheet, frame_names)
        ref_h = max(p.height for p in pieces)
        s = 400 / ref_h
        for name, piece in zip(frame_names, pieces):
            piece = piece.resize((max(1, int(piece.width * s)),
                                  max(1, int(piece.height * s))), Image.LANCZOS)
            piece.save(os.path.join(ASSETS, name + ".png"))
            print(f"       -> {name}.png  {piece.size}")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only in (None, "stalls"):
        gen_stalls()
    if only in (None, "chars"):
        gen_chars()
    print("done")


if __name__ == "__main__":
    main()
