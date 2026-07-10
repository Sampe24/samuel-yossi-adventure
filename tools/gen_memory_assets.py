# -*- coding: utf-8 -*-
"""Generate Memory Lane cutscene backgrounds + Granada street segments.

Memory Lane: a walkable timeline of Samuel & Yossi's real story, one wide
background per memory (the night they met, first Christmas/New Year, first
Semana Santa, Tonito's park at the Fuente del Triunfo).

Granada segments: the level background now transitions between different
streets of Granada, with the landmarks painted INTO the background art
(user feedback: standalone landmark sprites felt pasted on).

Usage:  python tools/gen_memory_assets.py
"""
import os

from PIL import Image

from gen_sheets import ASSETS, RAW, STYLE
from gen_city_assets import gemini_image

BASE = ("A 2D side-scrolling video game background. Wide landscape "
        "composition, layered depth for parallax, empty walkable street "
        "along the bottom, no people, no animals.")

BGS = {
    # ---- Granada level street segments (match bg_granada's warm look) ----
    # bg_gr_triunfo doubles as Tonito's park in Memory Lane (same place)
    "bg_gr_triunfo": (
        "Granada Spain, the Plaza del Triunfo gardens in warm afternoon "
        "light: a tall white baroque stone column monument topped with a "
        "small golden Virgin statue rising over trimmed green hedges, low "
        "arcs of white fountain jets, elegant black street lanterns, "
        "whitewashed Andalusian facades with terracotta roofs behind, "
        "snowy Sierra Nevada mountains in the far distance"),
    "bg_gr_genil": (
        "Granada Spain, the Rio Genil river promenade in warm afternoon "
        "light: a low curved stone embankment wall with a black wrought-"
        "iron railing along a pale rushing river with small rapids, leafy "
        "green trees, white houses climbing a green hill, snowcapped "
        "Sierra Nevada mountains under a blue sky with puffy clouds"),
    "bg_gr_salon": (
        "Granada Spain, the Paseo del Salon promenade at golden sunset: "
        "an ornate dark-green wrought-iron and glass belle-epoque kiosk "
        "pavilion with a small golden dome and warm glowing windows, a "
        "long wooden footbridge with plank railings, cafe terraces with "
        "cream parasols under big leafy plane trees, warm apartment "
        "facades with wooden balconies behind"),

    # ---- Memory Lane scenes ----
    "bg_mem_meet": (
        "A cosy Granada side street at night outside a small latin disco "
        "pub: a glowing neon sign reading CORAZON LATINO over the door, "
        "warm pink and teal neon light spilling onto the cobblestones, "
        "strings of small lights, a soft starry sky, romantic and warm"),
    "bg_mem_navidad": (
        "A Granada shopping street at Christmas night: canopies of "
        "thousands of warm golden fairy lights stretched overhead between "
        "the buildings, a giant glowing arch of white and gold lights, a "
        "big Christmas tree wrapped in warm lights, festive and magical"),
    "bg_mem_pascua": (
        "A solemn Spanish Semana Santa night scene in Granada: a "
        "magnificent golden processional float with an ornate embroidered "
        "canopy, dozens of tall white candles glowing warmly, masses of "
        "white flowers, silver candelabra, gentle incense haze drifting, "
        "grand stone facades behind, dark night sky"),
}


def main():
    for name, desc in BGS.items():
        out = os.path.join(ASSETS, name + ".png")
        if os.path.exists(out):
            print(f"[skip] {name}")
            continue
        raw = os.path.join(RAW, name + ".png")
        if not os.path.exists(raw):
            print(f"[gen ] {name}")
            with open(raw, "wb") as f:
                f.write(gemini_image(f"{BASE} {desc}. {STYLE}", "16:9"))
        img = Image.open(raw).convert("RGB")
        if img.width > 1536:
            img = img.resize((1536, int(img.height * 1536 / img.width)),
                             Image.LANCZOS)
        img.save(out)
        print(f"       -> {name}.png {img.size}")
    print("done")


if __name__ == "__main__":
    main()
