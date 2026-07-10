// Super Mario-style world map: nodes for every level along a winding route
// plus two bonus venues (dance club, duel arena). Walk with A/D, enter with
// ENTER or J. Locked nodes show a padlock until earned.

import { W, H, pressed, images, drawSprite, camera } from './engine.js';
import { LEVELS } from './levels.js';
import { danceUnlocked, duelUnlocked } from './progress.js';

// Node layout: a journey S-curve Spain -> Peru -> Sweden.
const LEVEL_NODES = [
  { x: 110, y: 430 }, { x: 240, y: 355 }, { x: 355, y: 435 },   // GRA MAD SEV
  { x: 470, y: 330 }, { x: 585, y: 415 },                        // CUS LIM
  { x: 715, y: 320 }, { x: 850, y: 395 },                        // SWE JKP
];
const EXTRA_NODES = [
  { x: 300, y: 205, type: 'dance', label: 'CLUB CORAZÓN',
    hint: 'DANCE BATTLE — WASD vs ARROWS', unlocked: danceUnlocked },
  { x: 640, y: 185, type: 'duel', label: 'PLAZA DE DUELO',
    hint: 'MELEE DUEL — 1v1 showdown', unlocked: duelUnlocked },
  { x: 95, y: 275, type: 'memory', label: 'MEMORY LANE',
    hint: 'our story — a walk to remember ♥', unlocked: danceUnlocked },
];

export function makeWorldMap(progress, startIdx = 0) {
  const nodes = [
    ...LEVEL_NODES.map((n, i) => ({
      ...n, type: 'level', idx: i, label: LEVELS[i].name,
      hint: LEVELS[i].subtitle, thumb: LEVELS[i].bg,
    })),
    ...EXTRA_NODES.map(n => ({ ...n })),
  ];
  return {
    nodes, progress,
    sel: Math.min(startIdx, nodes.length - 1),
    tokenX: nodes[startIdx]?.x ?? nodes[0].x,
    tokenY: nodes[startIdx]?.y ?? nodes[0].y,
    t: 0, denyT: 0,
  };
}

function isUnlocked(wm, node) {
  if (node.type === 'level') return node.idx < wm.progress.unlocked;
  return node.unlocked(wm.progress);
}

// A/D cycles through unlocked nodes (levels in order, then venues).
export function updateWorldMap(wm, dt) {
  wm.t += dt;
  wm.denyT = Math.max(0, wm.denyT - dt);
  const order = wm.nodes.map((n, i) => i).filter(i => isUnlocked(wm, wm.nodes[i]));
  let oi = order.indexOf(wm.sel);
  if (oi < 0) oi = 0;
  if (pressed['d'] || pressed['arrowright']) oi = (oi + 1) % order.length;
  if (pressed['a'] || pressed['arrowleft'])  oi = (oi - 1 + order.length) % order.length;
  wm.sel = order[oi];

  // token glides to the selected node
  const n = wm.nodes[wm.sel];
  wm.tokenX += (n.x - wm.tokenX) * Math.min(1, dt * 10);
  wm.tokenY += (n.y - wm.tokenY) * Math.min(1, dt * 10);

  if (pressed['enter'] || pressed['j']) {
    if (isUnlocked(wm, n)) {
      return n.type === 'level' ? { type: 'level', idx: n.idx } : { type: n.type };
    }
    wm.denyT = .6;
  }
  return null;
}

export function drawWorldMap(ctx, wm, who) {
  camera.x = 0;
  // parchment-sea backdrop
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#14284a'); g.addColorStop(1, '#0a1830');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // soft landmasses under the route
  ctx.fillStyle = 'rgba(64,92,60,.35)';
  blob(ctx, 210, 420, 260, 120);           // Iberia
  blob(ctx, 520, 390, 200, 110);           // Peru coast
  blob(ctx, 780, 360, 220, 130);           // Scandinavia
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 40; i++)             // twinkling star field
    ctx.fillRect((i * 173 + 40) % W, (i * 97 + 20) % 180,
                 2, 2);

  // dashed route between level nodes
  ctx.strokeStyle = '#e8c860'; ctx.lineWidth = 3; ctx.setLineDash([2, 9]);
  ctx.beginPath();
  LEVEL_NODES.forEach((n, i) => i ? ctx.lineTo(n.x, n.y) : ctx.moveTo(n.x, n.y));
  ctx.stroke();
  // spurs to the venues
  ctx.strokeStyle = '#b88ae0';
  for (const [from, to] of [[1, 7], [4, 8], [0, 9]]) {
    ctx.beginPath();
    ctx.moveTo(wm.nodes[from].x, wm.nodes[from].y);
    ctx.lineTo(wm.nodes[to].x, wm.nodes[to].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // nodes
  wm.nodes.forEach((n, i) => {
    const unlocked = isUnlocked(wm, n);
    const seld = i === wm.sel;
    const r = seld ? 34 + Math.sin(wm.t * 5) * 2 : 28;
    ctx.save();
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.clip();
    if (n.type === 'level' && images[n.thumb]) {
      const img = images[n.thumb];
      const s = (r * 2.4) / Math.min(img.width, img.height);
      ctx.drawImage(img, n.x - img.width * s / 2, n.y - img.height * s / 2,
                    img.width * s, img.height * s);
    } else {
      ctx.fillStyle = n.type === 'dance' ? '#3a1d5c'
                    : n.type === 'memory' ? '#4a1d3a' : '#5c1d24';
      ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2);
      ctx.font = `${Math.round(r)}px serif`; ctx.textAlign = 'center';
      ctx.fillText(n.type === 'dance' ? '💃' : n.type === 'memory' ? '💛' : '⚔️',
                   n.x, n.y + r * .36);
    }
    if (!unlocked) {
      ctx.fillStyle = 'rgba(6,8,16,.72)';
      ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2);
    }
    ctx.restore();
    // ring: gold = cleared, white = open, grey = locked
    const cleared = n.type === 'level' && wm.progress.cleared[LEVELS[n.idx].id];
    ctx.lineWidth = seld ? 5 : 3;
    ctx.strokeStyle = !unlocked ? '#4a4a5a' : cleared ? '#ffd24a'
                    : n.type !== 'level' ? '#b88ae0' : '#e8e8f0';
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.stroke();
    if (!unlocked) drawLock(ctx, n.x, n.y, wm.denyT > 0 && seld);
    if (cleared) {                        // little victory flag
      ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center'; ctx.fillText('★', n.x + r - 6, n.y - r + 10);
    }
  });

  // hero token standing on the selected node
  drawSprite(ctx, `${who}_idle`, wm.tokenX,
             wm.tokenY - 26 + Math.sin(wm.t * 3) * 3, 52, 1);

  // header + selected info
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('WORLD MAP — CHOOSE YOUR ADVENTURE', W / 2, 46);
  const n = wm.nodes[wm.sel];
  const unlocked = isUnlocked(wm, n);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 330, H - 86, 660, 62);
  ctx.fillStyle = unlocked ? '#fff' : '#8a8aa0'; ctx.font = 'bold 20px monospace';
  ctx.fillText(unlocked || n.type === 'level' ? n.label : '???', W / 2, H - 60);
  ctx.fillStyle = unlocked ? '#9ecbff' : '#666a80'; ctx.font = '14px monospace';
  ctx.fillText(unlocked ? n.hint
    : n.type === 'level' ? 'Clear the previous level to unlock'
    : n.type === 'dance' ? 'Clear GRANADA to unlock the dance club'
    : n.type === 'memory' ? 'Clear GRANADA to unlock this memory'
    : 'Clear MADRID to unlock the duel arena', W / 2, H - 38);
  ctx.fillStyle = '#8a86b8'; ctx.font = '13px monospace';
  ctx.fillText('A / D — travel      ENTER — go!', W / 2, H - 8);
}

function blob(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, 7);
  ctx.fill();
}

function drawLock(ctx, x, y, shake) {
  const dx = shake ? (Math.random() - .5) * 5 : 0;
  ctx.fillStyle = '#c8c8d8';
  ctx.fillRect(x - 7 + dx, y - 3, 14, 12);
  ctx.strokeStyle = '#c8c8d8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x + dx, y - 3, 5, Math.PI, 0); ctx.stroke();
}
