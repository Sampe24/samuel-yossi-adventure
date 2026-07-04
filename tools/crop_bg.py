# -*- coding: utf-8 -*-
"""Trim uniform near-white letterbox bars from bg_*.png assets."""
import glob
import os

from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

for path in glob.glob(os.path.join(ASSETS, "bg_*.png")):
    img = Image.open(path).convert("RGB")
    px = img.load()
    w, h = img.size

    def row_is_white(y):
        for x in range(0, w, 8):
            r, g, b = px[x, y]
            if r < 235 or g < 235 or b < 235:
                return False
        return True

    top = 0
    while top < h // 2 and row_is_white(top):
        top += 1
    bot = h - 1
    while bot > h // 2 and row_is_white(bot):
        bot -= 1
    if top > 0 or bot < h - 1:
        img = img.crop((0, top, w, bot + 1))
        img.save(path)
        print(f"cropped {os.path.basename(path)}: {h} -> {img.height}")
    else:
        print(f"ok      {os.path.basename(path)}")
