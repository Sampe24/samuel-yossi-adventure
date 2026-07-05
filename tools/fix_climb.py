# -*- coding: utf-8 -*-
"""Regenerate the climb pose WITHOUT the ladder baked into the sprite.

The game draws its own ladders (engine.drawLadders), so the character
sprite must contain only the character. Uses gpt-image edits with the
current (ladder-containing) sprite as reference so pose/outfit stay
identical.

Usage:  python tools/fix_climb.py
"""
import base64
import io
import os
import sys

import requests
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_sheets import KEYS, GPT_MODELS, key_magenta, RAW, ASSETS  # noqa: E402

PROMPT = ("Edit this video game sprite: REMOVE the wooden ladder completely — "
          "no ladder, no rungs, no poles, no wood anywhere. Keep ONLY the "
          "character, unchanged: exact same climbing pose (arms reaching up "
          "gripping thin air, one knee raised as if stepping on an invisible "
          "rung), same face, outfit, colors and pixel-art style. Fill the "
          "entire background with solid uniform pure magenta (#FF00FF). "
          "No text, no other objects, no shadows.")


def gpt_edit(ref_path):
    key = KEYS["GPT_API_KEY"]
    headers = {"Authorization": f"Bearer {key}"}
    last_err = None
    for model in GPT_MODELS:
        with open(ref_path, "rb") as rf:
            r = requests.post(
                "https://api.openai.com/v1/images/edits", headers=headers,
                files={"image[]": (os.path.basename(ref_path), rf, "image/png")},
                data={"model": model, "prompt": PROMPT, "size": "1024x1536",
                      "quality": "high"},
                timeout=300)
        if r.status_code == 200:
            print(f"    using {model}")
            return base64.b64decode(r.json()["data"][0]["b64_json"])
        last_err = f"{model}: {r.status_code} {r.text[:160]}"
        if r.status_code not in (400, 404) or "model" not in r.text.lower():
            break
    raise RuntimeError(last_err)


def fix(hero):
    src = os.path.join(ASSETS, f"{hero}_climb.png")
    raw = os.path.join(RAW, f"{hero}_climb_fix.png")
    print(f"[gen ] {hero}_climb (ladder removal)")
    if not os.path.exists(raw):
        data = gpt_edit(src)
        with open(raw, "wb") as f:
            f.write(data)
    img = key_magenta(Image.open(raw))
    bb = img.getbbox()
    if bb:
        img = img.crop(bb)
    s = 400 / img.height                       # same normalization as gen_sheets
    img = img.resize((max(1, int(img.width * s)), 400), Image.LANCZOS)
    img.save(src)
    print(f"       -> {hero}_climb.png {img.size}")


if __name__ == "__main__":
    for hero in ("samuel", "yossi"):
        fix(hero)
    print("done")
