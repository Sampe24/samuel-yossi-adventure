# -*- coding: utf-8 -*-
"""Generate game sprites and backgrounds via Gemini image API (Nano Banana).

Idempotent: skips any asset whose processed output already exists in assets/.
Raw API output goes to tools/raw/, processed transparent sprites to assets/.
"""
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "tools", "raw")
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(RAW, exist_ok=True)
os.makedirs(ASSETS, exist_ok=True)

# --- read API key from .env ---
API_KEY = None
with open(os.path.join(ROOT, ".env"), encoding="utf-8") as f:
    for line in f:
        if line.strip().startswith("GEMINI_API_KEY="):
            API_KEY = line.strip().split("=", 1)[1]
if not API_KEY:
    sys.exit("GEMINI_API_KEY not found in .env")

MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

SAMUEL_REF = os.path.join(ROOT, "player two samuel.png")
YOSSI_REF = os.path.join(ROOT, "player one yossi.png")

STYLE = ("Retro 16-bit SNES-era video game art style, clean bold black outlines, "
         "vibrant saturated colors, cel shaded.")
SPRITE_RULES = ("Single full-body character game sprite, side view facing RIGHT, "
                "whole body fully visible and centered, feet at the bottom. "
                "Background must be one solid uniform pure green color (#00FF00) "
                "with absolutely nothing else - no shadow, no ground, no text, no border.")
SPRITE_RULES_MAGENTA = SPRITE_RULES.replace("pure green color (#00FF00)",
                                            "pure magenta color (#FF00FF)")

SAMUEL_DESC = ("a cheerful young Swedish man hero with shaggy blond hair, short "
               "reddish-blond beard, blue eyes, wearing a cream/beige t-shirt, a blue "
               "bandana around his neck, grey cargo shorts, brown hiking boots and a "
               "small green backpack")
YOSSI_DESC = ("a cheerful young Peruvian woman hero with long straight black hair, "
              "wearing a bright lime-green t-shirt, khaki cargo pants, brown hiking "
              "boots and a small green backpack")

HERO_POSES = {
    "idle":  "standing relaxed and alert, arms at sides, subtle heroic stance",
    "run1":  "mid-run sprint pose, left leg forward, arms pumping",
    "run2":  "mid-run sprint pose, right leg forward, arms pumping, opposite stride phase",
    "jump":  "jumping in mid-air, knees tucked up, one arm raised",
    "slash": "swinging a shining steel sword in a wide forward slash arc, dynamic action pose",
    "shoot": "aiming and firing a small retro sci-fi pistol forward with both hands, muzzle flash",
    "throw": "throwing a hand grenade forward overarm, arm extended forward after release",
}

ENEMIES = {
    "crusader":   "a menacing medieval crusader knight enemy in chainmail and white tabard with a red cross, closed great helm, holding a longsword and kite shield",
    "jihadist":   "a menacing medieval Moorish warrior enemy in dark robes and turban wrapped across the face, holding a curved scimitar, glowing eyes",
    "gargoyle":   "a stone gargoyle monster enemy with bat wings, horns, glowing orange eyes, crouched and snarling",
    "boss_alhambra": "a huge intimidating boss: a giant armored sultan djinn spirit, ornate golden Moorish armor, flaming scimitar in each hand, smoke swirling from his lower body, glowing eyes",
    "inca":       "a menacing Inca warrior enemy with feathered headdress, gold and red tunic, war paint, holding a spear and small round shield",
    "supay":      "Supay, an Andean underworld demon monster enemy, horned, red and black skin, sharp teeth, clawed hands, tattered poncho",
    "condor":     "a giant monstrous Andean condor beast enemy with spread black wings, white neck ruff, sharp talons, screeching",
    "boss_cusco": "a huge intimidating boss: a colossal living Inca stone golem made of carved Cusco masonry blocks, glowing golden runes, massive stone fists, feathered stone crown",
    "troll":      "a big goofy Scandinavian forest troll enemy with mossy green skin, large nose, small eyes, wooden club, birch leaves growing on its shoulders",
    "nacken":     "Nacken, a Swedish water spirit enemy, pale eerie naked-torso man rising from dark water, long wet hair, holding a violin, ghostly blue glow",
}

BACKGROUNDS = {
    "granada": "Wide side-scrolling video game background of the streets of Granada, Spain at golden afternoon: whitewashed Andalusian houses, terracotta roofs, Moorish arches, distant Alhambra palace on a hill, Sierra Nevada mountains behind. Horizontal composition, ground along the bottom edge.",
    "alhambra": "Wide side-scrolling video game background of the interior of the Alhambra palace boss arena: ornate Moorish arches, intricate arabesque tilework, columns of the Court of the Lions, warm torchlight, dramatic shadows. Horizontal composition, floor along the bottom edge.",
    "cusco": "Wide side-scrolling video game background of Cusco, Peru: Andean mountains, Inca stone walls with perfect masonry, colonial red-tiled roofs, Plaza de Armas cathedral in the distance, llamas, dramatic blue sky with clouds. Horizontal composition, ground along the bottom edge.",
    "sweden": "Wide side-scrolling video game background of a Swedish summer forest: tall pine and birch trees, wildflower meadow, red wooden cottage with white trim, glimpse of a lake, long golden evening light. Horizontal composition, ground along the bottom edge.",
    "sunset": "Wide cinematic video game background of a Swedish midsummer sunset over a calm lake: sun low on the horizon painting the sky orange pink and violet, dark pine silhouettes, a maypole (midsommarstang) silhouette on the shore, gentle water reflections. Horizontal composition, shoreline along the bottom edge.",
}


def call_gemini(prompt, ref_paths=(), retries=5):
    parts = [{"text": prompt}]
    for rp in ref_paths:
        with open(rp, "rb") as f:
            parts.append({"inline_data": {
                "mime_type": "image/png",
                "data": base64.b64encode(f.read()).decode()}})
    body = json.dumps({"contents": [{"parts": parts}]}).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                URL, data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.load(r)
            for part in resp["candidates"][0]["content"]["parts"]:
                if "inlineData" in part:
                    return base64.b64decode(part["inlineData"]["data"])
                if "inline_data" in part:
                    return base64.b64decode(part["inline_data"]["data"])
            raise ValueError("no image in response: " + json.dumps(resp)[:400])
        except urllib.error.HTTPError as e:
            detail = e.read()[:300]
            if e.code in (429, 500, 503) and attempt < retries - 1:
                wait = 20 * (attempt + 1)
                print(f"    HTTP {e.code}, retry in {wait}s ({detail[:120]})")
                time.sleep(wait)
                continue
            raise RuntimeError(f"HTTP {e.code}: {detail}") from e
        except (ValueError, KeyError, TimeoutError, OSError) as e:
            if attempt < retries - 1:
                print(f"    {type(e).__name__}: {e}; retrying")
                time.sleep(15)
                continue
            raise
    raise RuntimeError("unreachable")


def chroma_key(src_path, out_path, max_h=None, key="green"):
    """Chroma background -> transparent, then autocrop and optionally scale."""
    img = Image.open(src_path).convert("RGBA")
    px = img.load()
    w, h = img.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if key == "green":
        bg = max(corners, key=lambda c: c[1] - (c[0] + c[2]) / 2)
    else:
        bg = max(corners, key=lambda c: (c[0] + c[2]) / 2 - c[1])

    def is_bg(c):
        d = abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2])
        if key == "green":
            pure = c[1] > 120 and c[1] > c[0] * 1.6 and c[1] > c[2] * 1.6
        else:
            pure = c[0] > 140 and c[2] > 140 and c[1] < min(c[0], c[2]) * 0.55
        return d < 120 or pure

    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if is_bg(c):
                px[x, y] = (0, 0, 0, 0)
            elif key == "green" and c[1] > max(c[0], c[2]) + 60:  # de-spill fringe
                px[x, y] = (c[0], max(c[0], c[2]), c[2], c[3])
            elif key == "magenta" and c[0] > c[1] + 70 and c[2] > c[1] + 70:
                m = c[1]
                px[x, y] = (min(c[0], m + 90), c[1], min(c[2], m + 90), c[3])
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    if max_h and img.height > max_h:
        s = max_h / img.height
        img = img.resize((max(1, int(img.width * s)), max_h), Image.LANCZOS)
    img.save(out_path)


def gen_sprite(name, prompt, refs=(), max_h=256, key="green"):
    out = os.path.join(ASSETS, name + ".png")
    if os.path.exists(out):
        print(f"[skip] {name}")
        return
    print(f"[gen ] {name}")
    raw = os.path.join(RAW, name + ".png")
    if not os.path.exists(raw):
        data = call_gemini(prompt, refs)
        with open(raw, "wb") as f:
            f.write(data)
        time.sleep(8)  # stay under rate limits
    chroma_key(raw, out, max_h=max_h, key=key)
    print(f"       -> {out}")


def gen_background(name, prompt):
    out = os.path.join(ASSETS, "bg_" + name + ".png")
    if os.path.exists(out):
        print(f"[skip] bg_{name}")
        return
    print(f"[gen ] bg_{name}")
    data = call_gemini(prompt + " " + STYLE + " 16:9 landscape. No text, no watermark, no characters.")
    img_path = os.path.join(RAW, "bg_" + name + ".png")
    with open(img_path, "wb") as f:
        f.write(data)
    img = Image.open(img_path).convert("RGB")
    if img.width > 1536:
        s = 1536 / img.width
        img = img.resize((1536, int(img.height * s)), Image.LANCZOS)
    img.save(out, quality=90)
    print(f"       -> {out}")
    time.sleep(8)


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None

    if only in (None, "heroes"):
        for hero, desc, ref in (("samuel", SAMUEL_DESC, SAMUEL_REF),
                                ("yossi", YOSSI_DESC, YOSSI_REF)):
            for pose, pdesc in HERO_POSES.items():
                prompt = (f"Create {SPRITE_RULES} The character is {desc}, matching the "
                          f"attached reference illustration's face and outfit. Pose: {pdesc}. {STYLE}")
                gen_sprite(f"{hero}_{pose}", prompt, refs=(ref,))

    if only in (None, "enemies"):
        for name, desc in ENEMIES.items():
            big = name.startswith("boss")
            prompt = f"Create {SPRITE_RULES} The character is {desc}. {STYLE}"
            gen_sprite(name, prompt, max_h=420 if big else 230)

    if only in (None, "backgrounds"):
        for name, prompt in BACKGROUNDS.items():
            gen_background(name, prompt)

    if only == "magenta-redo":
        # green-content characters ruined by green chroma: redo on magenta bg
        for pose, pdesc in HERO_POSES.items():
            prompt = (f"Create {SPRITE_RULES_MAGENTA} The character is {YOSSI_DESC}, matching "
                      f"the attached reference illustration's face and outfit. Pose: {pdesc}. {STYLE}")
            gen_sprite(f"yossi_{pose}", prompt, refs=(YOSSI_REF,), key="magenta")
        for name in ("troll", "gargoyle"):
            prompt = f"Create {SPRITE_RULES_MAGENTA} The character is {ENEMIES[name]}. {STYLE}"
            gen_sprite(name, prompt, max_h=230, key="magenta")

    print("All done.")


if __name__ == "__main__":
    main()
