// Core engine: asset loading, input, camera, physics helpers, drawing.

export const W = 960, H = 540;
export const GROUND_Y = 470;
export const GRAVITY = 2400;

// ---------- assets ----------
export const images = {};

export function loadImages(names) {
  return Promise.all(names.map(n => new Promise(res => {
    const img = new Image();
    img.onload = () => { images[n] = img; res(); };
    img.onerror = () => { console.warn('missing asset', n); images[n] = null; res(); };
    img.src = `assets/${n}.png`;
  })));
}

// ---------- input ----------
export const keys = {};
export const pressed = {};   // edge-triggered, cleared each frame

addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if (!keys[e.key.toLowerCase()]) pressed[e.key.toLowerCase()] = true;
  keys[e.key.toLowerCase()] = true;
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

export function clearPressed() { for (const k in pressed) delete pressed[k]; }

export const input = {
  left:  () => keys['a'] || keys['arrowleft'],
  right: () => keys['d'] || keys['arrowright'],
  jump:  () => pressed['w'] || pressed['arrowup'] || pressed[' '],
  up:    () => keys['w'] || keys['arrowup'],
  down:  () => keys['s'] || keys['arrowdown'],
  sword: () => pressed['j'] || pressed['x'],
  gunPress: () => pressed['k'] || pressed['c'],
  gunHold:  () => keys['k'] || keys['c'],
  guard: () => keys['h'] || keys['b'],
  nade:  () => pressed['l'] || pressed['v'],
  pause: () => pressed['p'],
};

// ---------- math / collision ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// True when the entity's center is over a bottomless pit.
export function overPit(e, pits) {
  if (!pits || !pits.length) return false;
  const cx = e.x + e.w / 2;
  return pits.some(p => cx > p.x && cx < p.x + p.w);
}

// Resolve vertical physics against ground plane + one-way platforms.
// Ground does not exist over pits — entities fall through and off-screen.
export function stepPhysics(e, dt, platforms, pits) {
  e.vy += GRAVITY * dt;
  e.x += e.vx * dt;
  const prevBottom = e.y + e.h;
  e.y += e.vy * dt;
  e.onGround = false;
  if (e.y + e.h >= GROUND_Y && !overPit(e, pits)) {
    e.y = GROUND_Y - e.h;
    e.vy = 0;
    e.onGround = true;
  } else if (e.vy > 0 && platforms) {
    for (const p of platforms) {
      if (e.x + e.w > p.x && e.x < p.x + p.w &&
          prevBottom <= p.y + 6 && e.y + e.h >= p.y) {
        e.y = p.y - e.h;
        e.vy = 0;
        e.onGround = true;
        break;
      }
    }
  }
}

// ---------- camera ----------
export const camera = { x: 0, shake: 0 };

export function updateCamera(target, levelLen, dt) {
  const want = clamp(target.x + target.w / 2 - W / 2, 0, Math.max(0, levelLen - W));
  camera.x += (want - camera.x) * Math.min(1, dt * 8);
  if (camera.shake > 0) camera.shake = Math.max(0, camera.shake - dt * 30);
}

// ---------- drawing ----------
// tint: optional { color, a } wash painted over the sprite's own pixels,
// used for the enemy telegraph flash and the NPC depth wash. Composited on
// an offscreen canvas — source-atop on the main canvas would tint the whole
// bounding box, since the background below is opaque.
let tintCanvas = null;
export function drawSprite(ctx, name, cx, bottomY, hgt, facing = 1, alpha = 1,
                           rot = 0, tint = null) {
  const img = images[name];
  const sx = cx - camera.x + (camera.shake ? (Math.random() - .5) * camera.shake : 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (img) {
    const w = hgt * (img.width / img.height);
    ctx.translate(sx, bottomY - (rot ? hgt / 2 : 0));
    if (rot) ctx.rotate(rot * facing);
    if (facing < 0) ctx.scale(-1, 1);
    const dx = -w / 2, dy = rot ? -hgt / 2 : -hgt;
    if (tint && tint.a > 0) {
      const tw = Math.max(1, Math.ceil(w)), th = Math.max(1, Math.ceil(hgt));
      if (!tintCanvas) tintCanvas = document.createElement('canvas');
      if (tintCanvas.width < tw) tintCanvas.width = tw;
      if (tintCanvas.height < th) tintCanvas.height = th;
      const tc = tintCanvas.getContext('2d');
      tc.clearRect(0, 0, tw, th);
      tc.drawImage(img, 0, 0, w, hgt);
      tc.globalCompositeOperation = 'source-atop';
      tc.globalAlpha = tint.a;
      tc.fillStyle = tint.color;
      tc.fillRect(0, 0, tw, th);
      tc.globalCompositeOperation = 'source-over';
      tc.globalAlpha = 1;
      ctx.drawImage(tintCanvas, 0, 0, tw, th, dx, dy, tw, th);
    } else {
      ctx.drawImage(img, dx, dy, w, hgt);
    }
  } else {                       // fallback box if asset missing
    ctx.fillStyle = '#e055e0';
    ctx.fillRect(sx - 15, bottomY - hgt, 30, hgt);
  }
  ctx.restore();
}

// One continuous mural: the segment images are laid side by side on the
// parallax layer with a soft blended seam, so new streets scroll in as part
// of the world (no screen-wide crossfade). The parallax factor is derived
// so the full strip is traversed exactly over the level's length.
export function drawStitchedBackground(ctx, names, levelLen, overlap = 150) {
  const imgs = names.map(n => images[n]).filter(Boolean);
  if (!imgs.length) { ctx.fillStyle = '#223'; ctx.fillRect(0, 0, W, H); return; }
  const hgt = GROUND_Y + 30;
  const ws = imgs.map(im => im.width * hgt / im.height);
  const total = ws.reduce((a, b) => a + b, 0) - overlap * (imgs.length - 1);
  const p = Math.max(.15, (total - W) / Math.max(1, levelLen - W));
  let x = -camera.x * p;
  for (let i = 0; i < imgs.length; i++) {
    const im = imgs[i], w = ws[i];
    if (x < W + 2 && x + w > -2) {
      if (i === 0) {
        ctx.drawImage(im, x, 0, w, hgt);
      } else {
        // blend the first `overlap` px over the previous image in slices
        const S = 10, sw = overlap / S, sx = im.width / w;
        for (let s = 0; s < S; s++) {
          ctx.globalAlpha = (s + 1) / S;
          ctx.drawImage(im, s * sw * sx, 0, sw * sx, im.height,
                        x + s * sw, 0, sw + 1, hgt);
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(im, overlap * sx, 0, im.width - overlap * sx, im.height,
                      x + overlap, 0, w - overlap, hgt);
      }
    }
    x += w - overlap;
  }
}

// where (in world-x) stitched segment i begins — used for landmark popups
export function stitchedBounds(names, levelLen, overlap = 150) {
  const imgs = names.map(n => images[n]).filter(Boolean);
  if (!imgs.length) return [];
  const hgt = GROUND_Y + 30;
  const ws = imgs.map(im => im.width * hgt / im.height);
  const total = ws.reduce((a, b) => a + b, 0) - overlap * (imgs.length - 1);
  const p = Math.max(.15, (total - W) / Math.max(1, levelLen - W));
  const out = [];
  let o = 0;
  for (let i = 0; i < ws.length - 1; i++) {
    o += ws[i] - overlap;
    // world-x of the player when this seam sits at the screen centre
    out.push((o + overlap / 2 - W / 2) / p + W / 2);
  }
  return out;
}

// Background that changes as you travel: `segs` is a list of image names,
// `bounds` the world-x positions where one street hands over to the next.
// Around each boundary the two neighbours crossfade, so walking the level
// feels like moving through different parts of the city.
export function drawSegmentedBackground(ctx, segs, bounds, parallax = 0.35,
                                        fade = 320) {
  const c = camera.x + W / 2;                    // view centre in world coords
  let k = 0;
  while (k < bounds.length && c > bounds[k]) k++;
  drawBackground(ctx, segs[k], parallax);
  // fading into the previous / next street?
  if (k > 0 && c < bounds[k - 1] + fade) {
    ctx.save();
    ctx.globalAlpha = clamp((bounds[k - 1] + fade - c) / (fade * 2), 0, 1);
    drawBackground(ctx, segs[k - 1], parallax);
    ctx.restore();
  } else if (k < bounds.length && c > bounds[k] - fade) {
    ctx.save();
    ctx.globalAlpha = clamp((c - (bounds[k] - fade)) / (fade * 2), 0, 1);
    drawBackground(ctx, segs[k + 1], parallax);
    ctx.restore();
  }
}

export function drawBackground(ctx, name, parallax = 0.35, offsetY = 0) {
  const img = images[name];
  if (!img) { ctx.fillStyle = '#223'; ctx.fillRect(0, 0, W, H); return; }
  const scale = (GROUND_Y + 30) / img.height;
  const bw = img.width * scale;
  const world = -camera.x * parallax;
  let idx = Math.floor(-world / bw);
  let off = world + idx * bw;
  // mirror every other tile so the repeat seam is invisible
  for (let x = off; x < W; x += bw, idx++) {
    if (idx % 2) {
      ctx.save();
      ctx.translate(x + bw, offsetY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, bw, img.height * scale);
      ctx.restore();
    } else {
      ctx.drawImage(img, x, offsetY, bw, img.height * scale);
    }
  }
}

export function drawGround(ctx, level) {
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  g.addColorStop(0, level.groundTop);
  g.addColorStop(1, level.groundBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  // brick/texture lines scrolling with world
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 2;
  const step = 46;
  for (let wx = Math.floor(camera.x / step) * step; wx < camera.x + W + step; wx += step) {
    const sx = wx - camera.x;
    ctx.beginPath(); ctx.moveTo(sx, GROUND_Y); ctx.lineTo(sx, H); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 1); ctx.lineTo(W, GROUND_Y + 1); ctx.stroke();

  // carve out pits — dark chasms that fade to black
  for (const p of level.pits || []) {
    const sx = p.x - camera.x;
    if (sx > W || sx + p.w < 0) continue;
    const pg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    pg.addColorStop(0, '#1a1420');
    pg.addColorStop(1, '#000');
    ctx.fillStyle = pg;
    ctx.fillRect(sx, GROUND_Y, p.w, H - GROUND_Y);
    // jagged rim
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    for (let j = 0; j < p.w; j += 14)
      ctx.fillRect(sx + j, GROUND_Y, 8, 6 + (j * 7 % 9));
  }
}

export function drawLadders(ctx, level) {
  for (const l of level.ladders || []) {
    const sx = l.x - camera.x;
    if (sx > W || sx + l.w < 0) continue;
    ctx.strokeStyle = '#6e4a24';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx + 3, l.y); ctx.lineTo(sx + 3, l.y + l.h);
    ctx.moveTo(sx + l.w - 3, l.y); ctx.lineTo(sx + l.w - 3, l.y + l.h);
    ctx.stroke();
    ctx.strokeStyle = '#8a5f30';
    ctx.lineWidth = 4;
    for (let ry = l.y + 10; ry < l.y + l.h - 4; ry += 18) {
      ctx.beginPath(); ctx.moveTo(sx + 2, ry); ctx.lineTo(sx + l.w - 2, ry); ctx.stroke();
    }
  }
}

export function drawPlatforms(ctx, level) {
  const tile = level.tile && images[level.tile];
  for (const p of level.platforms) {
    const sx = p.x - camera.x;
    if (sx > W || sx + p.w < 0) continue;
    if (tile) {
      // themed ledge sprite (rooftop / stone terrace / wooden ledge)
      const th = 38;                       // drawn height, slight overhang on top
      const s = th / tile.height;
      const tw = tile.width * s;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - 4, p.y - 14, p.w + 8, th + 6);
      ctx.clip();
      for (let x = sx - 4; x < sx + p.w + 4; x += tw)
        ctx.drawImage(tile, x, p.y - 14, tw, th);
      ctx.restore();
    } else {
      ctx.fillStyle = level.platColor;
      ctx.fillRect(sx, p.y, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(sx, p.y, p.w, 4);
      ctx.strokeStyle = 'rgba(0,0,0,.4)';
      ctx.strokeRect(sx + .5, p.y + .5, p.w - 1, p.h - 1);
    }
  }
}
