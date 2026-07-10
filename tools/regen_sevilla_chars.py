# -*- coding: utf-8 -*-
"""Regenerate the Sevilla NPC character sheet FULL BODY.

The first generation came out waist-up (no legs), so the vendor looked like
a giant legless torso next to the full-body NPCs of every other city.
Uses make_image (GPT Images first, Gemini fallback) with a prompt that
hammers on head-to-feet framing, then slices and normalizes like
gen_city_assets.gen_chars.

Usage:  python tools/regen_sevilla_chars.py
"""
import os

from PIL import Image

from gen_sheets import ASSETS, RAW, STYLE, key_magenta, make_image, slice_sheet
from gen_city_assets import CHARS, MAGENTA

LEVEL = "sevilla"
RAW_NAME = "sheet_npc_sevilla_fullbody.png"   # new name: never reuse cached waist-up sheet


def prompt():
    cfg = CHARS[LEVEL]
    return (f"A video game character sprite sheet: EXACTLY 8 poses of the SAME "
            f"character, arranged in a strict grid of 2 rows and 4 columns with "
            f"clear empty spacing between every pose. {MAGENTA} The character "
            f"is {cfg['desc']}, wearing a long dark skirt and black flat shoes. "
            f"CRITICAL: every pose shows the ENTIRE body from the top of the "
            f"head down to the shoes — legs, ankles and both feet fully visible "
            f"and standing on the ground. Absolutely NO waist-up, NO half-body, "
            f"NO cropped or cut-off poses; full-figure like a paper doll. "
            f"Identical face, outfit and body size in every pose, side view "
            f"facing RIGHT. Poses come in pairs: each pair is TWO consecutive "
            f"animation frames of the same action with only a small natural "
            f"movement between them. {cfg['actions']} IMPORTANT: poses 3 and 4 "
            f"BOTH include the same small wooden table with the hand juicer — "
            f"the table appears identically in both frames, only her arm moves. "
            f"{STYLE}")


def main():
    cfg = CHARS[LEVEL]
    frame_names = [f"npc_{LEVEL}_{s}_{i}" for s in cfg["sets"] for i in (0, 1)]
    raw = os.path.join(RAW, RAW_NAME)
    if not os.path.exists(raw):
        print("[gen ] sevilla full-body sheet")
        with open(raw, "wb") as f:
            f.write(make_image(prompt(), None, label="sevilla_fullbody"))
    sheet = key_magenta(Image.open(raw))
    pieces = slice_sheet(sheet, frame_names)
    s = 400 / max(p.height for p in pieces)
    for n, piece in zip(frame_names, pieces):
        piece = piece.resize((max(1, int(piece.width * s)),
                              max(1, int(piece.height * s))), Image.LANCZOS)
        piece.save(os.path.join(ASSETS, n + ".png"))
        print(f"       -> {n}.png  {piece.size}")
    print("done")


if __name__ == "__main__":
    main()
