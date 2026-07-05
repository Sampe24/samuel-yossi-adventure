# -*- coding: utf-8 -*-
"""Generate the dog companion sprite sheet with Nano Banana Pro, using the
real dog's photo as a style/identity reference, then slice into frames.

Usage: python tools/gen_dog.py [path-to-reference-photo]
"""
import base64
import os
import sys
import time

import requests
from PIL import Image

from gen_sheets import ASSETS, KEYS, RAW, STYLE, key_magenta, slice_sheet

GEMINI_MODELS = ["gemini-3-pro-image-preview", "gemini-2.5-flash-image"]

REF = sys.argv[1] if len(sys.argv) > 1 else \
    r"C:\Users\sampe\Downloads\Photos-3-001\IMG-20240915-WA0006.jpg"

FRAMES = ["dog_idle_0", "dog_idle_1", "dog_run_0", "dog_run_1",
          "dog_jump_0", "dog_sit_0", "dog_bark_0", "dog_bark_1"]

PROMPT = (
    "A video game sprite sheet: EXACTLY 8 poses of the SAME small dog, "
    "arranged in a strict grid of 2 rows and 4 columns with clear empty "
    "spacing between every pose. Solid uniform pure magenta (#FF00FF) "
    "background everywhere, no grid lines, no text, no labels, no borders, "
    "no shadows. The dog is the Yorkshire Terrier from the reference photo: "
    "a tiny fluffy yorkie with long silky cream and light-tan fur, darker "
    "golden-tan face and legs, small pointy upright ears, dark button nose "
    "and a happy expression. Identical dog in every pose, full body visible, "
    "side view facing RIGHT. "
    "Row 1, left to right: (1) standing idle, tail relaxed; (2) standing "
    "idle, tail wagging up (small movement from pose 1); (3) running gallop "
    "with front legs stretched forward; (4) running gallop with legs "
    "gathered under the body; "
    "Row 2, left to right: (5) jumping in mid-air, body stretched; "
    "(6) sitting happily with tongue out; (7) barking with mouth open, "
    "front legs planted; (8) barking with mouth closed, same stance as 7. "
    + STYLE
)


def gemini_image_with_ref(prompt, ref_path, aspect="16:9"):
    key = KEYS["GEMINI_API_KEY"]
    with open(ref_path, "rb") as f:
        ref_b64 = base64.b64encode(f.read()).decode()
    parts = [{"text": prompt},
             {"inline_data": {"mime_type": "image/jpeg", "data": ref_b64}}]
    last = None
    for model in GEMINI_MODELS:
        url = ("https://generativelanguage.googleapis.com/v1beta/models/"
               f"{model}:generateContent?key={key}")
        for body in (
            {"contents": [{"parts": parts}],
             "generationConfig": {"imageConfig": {"aspectRatio": aspect}}},
            {"contents": [{"parts": parts}]},
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


def main():
    raw = os.path.join(RAW, "sheet_dog.png")
    if not os.path.exists(raw):
        print("[gen ] dog sheet (8 poses, 1 call, with photo reference)")
        with open(raw, "wb") as f:
            f.write(gemini_image_with_ref(PROMPT, REF))
    sheet = key_magenta(Image.open(raw))
    pieces = slice_sheet(sheet, FRAMES)
    s = 240 / max(p.height for p in pieces)      # dog is small — 240px master
    for name, piece in zip(FRAMES, pieces):
        piece = piece.resize((max(1, int(piece.width * s)),
                              max(1, int(piece.height * s))), Image.LANCZOS)
        piece.save(os.path.join(ASSETS, name + ".png"))
        print(f"  -> {name}.png {piece.size}")
    print("done")


if __name__ == "__main__":
    main()
