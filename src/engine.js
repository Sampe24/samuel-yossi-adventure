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
  gun:   () => keys['k'] || keys['c'],
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
export function drawSprite(ctx, name, cx, bottomY, hgt, facing = 1, alpha = 1, rot = 0) {
  const img = images[name];
  const sx = cx - camera.x + (camera.shake ? (Math.random() - .5) * camera.shake : 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (img) {
    const w = hgt * (img.width / img.height);
    ctx.translate(sx, bottomY - (rot ? hgt / 2 : 0));
    if (rot) ctx.rotate(rot * facing);
    if (facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, rot ? -hgt / 2 : -hgt, w, hgt);
  } else {                       // fallback box if asset missing
    ctx.fillStyle = '#e055e0';
    ctx.fillRect(sx - 15, bottomY - hgt, 30, hgt);
  }
  ctx.restore();
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
  for (const p of level.platforms) {
    const sx = p.x - camera.x;
    if (sx > W || sx + p.w < 0) continue;
    ctx.fillStyle = level.platColor;
    ctx.fillRect(sx, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(sx, p.y, p.w, 4);
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.strokeRect(sx + .5, p.y + .5, p.w - 1, p.h - 1);
  }
}
