// Melee duel minigame: 1v1 sword showdown on a boss-style arena.
// P1: A/D move, W jump, F slash, G guard.  P2: arrows move/jump, K slash,
// L guard — an AI fights for P2 until a human touches its keys.

import { W, H, GROUND_Y, keys, pressed, stepPhysics, drawSprite, camera,
         overlap, clamp } from './engine.js';
import { playSong, stopMusic, sfx } from './audio.js';

const ARENA = {
  groundTop: '#7a5a6a', groundBottom: '#4a3444', platColor: '#8a6a7a',
  platforms: [{ x: 120, y: 360, w: 150, h: 20 },
              { x: W - 270, y: 360, w: 150, h: 20 }],
  pits: [],
};
const MAX_HP = 8, ROUND_TIME = 60;

const P1_KEYS = { left: 'a', right: 'd', jump: 'w', att: 'f', guard: 'g' };
const P2_KEYS = { left: 'arrowleft', right: 'arrowright', jump: 'arrowup',
                  att: 'k', guard: 'l' };

function makeFighter(who, x, facing) {
  return {
    who, x, y: GROUND_Y - 64, w: 38, h: 64, vx: 0, vy: 0,
    facing, onGround: true, hp: MAX_HP,
    slashCd: 0, action: null, actionT: 0, guarding: false,
    inv: 0, animTimer: 0, hitFlash: 0, squash: 0,
    aiT: 0, aiMove: 0,
  };
}

export function makeDuel(game) {
  playSong('boss');
  const otherWho = game.myWho === 'samuel' ? 'yossi' : 'samuel';
  return {
    f1: makeFighter(game.myWho, 180, 1),
    f2: makeFighter(otherWho, W - 220, -1),
    p2ai: true, time: ROUND_TIME, t: 0,
    hits: [], particles: [], popups: [],
    winner: null, doneT: 0, shake: 0, freeze: 0,
    introT: 2.2,
  };
}

function doSlash(du, f, foe) {
  f.action = 'slash'; f.actionT = .22; f.slashCd = .48;
  f.animTimer = 0;
  sfx.slash();
  const hb = { x: f.facing === 1 ? f.x + f.w - 6 : f.x - 48,
               y: f.y + 6, w: 54, h: 52 };
  du.hits.push({ ...hb, t: .1, owner: f });
  if (overlap(hb, foe) && foe.inv <= 0) {
    if (foe.guarding && foe.facing !== f.facing) {        // faced the attack
      sfx.guard();
      foe.vx = f.facing * 160;
      spark(du, foe.x + foe.w / 2, foe.y + 26, '#ffd76a');
    } else {
      foe.hp--; foe.inv = .55; foe.hitFlash = .15;
      foe.vx = f.facing * 300; foe.vy = -180;
      du.freeze = .06; du.shake = 6;
      sfx.hurt();
      spark(du, foe.x + foe.w / 2, foe.y + 26, '#ff7d7d');
      du.popups.push({ x: foe.x + foe.w / 2, y: foe.y - 10, text: '-1',
                       color: '#ff7d7d', t: .8, vy: -60 });
    }
  }
}

function controlFighter(du, f, foe, map, dt) {
  const dir = keys[map.left] ? -1 : keys[map.right] ? 1 : 0;
  f.guarding = keys[map.guard] && f.onGround;
  if (f.guarding) {
    f.vx = 0;
    if (dir) f.facing = dir;
  } else {
    f.vx = dir * 290;
    if (dir) f.facing = dir;
    if (pressed[map.jump] && f.onGround) { f.vy = -820; sfx.jump(); }
    if (pressed[map.att] && f.slashCd <= 0) doSlash(du, f, foe);
  }
}

function aiFighter(du, f, foe, dt) {
  f.aiT -= dt;
  const dx = foe.x - f.x, adx = Math.abs(dx);
  if (f.aiT <= 0) {                                       // re-plan
    f.aiT = .25 + Math.random() * .35;
    if (adx > 90) f.aiMove = Math.sign(dx);               // approach
    else if (Math.random() < .25) f.aiMove = -Math.sign(dx); // space out
    else f.aiMove = 0;
    // block reads: guard sometimes when the foe swings
    f.aiGuard = foe.action === 'slash' && adx < 110 && Math.random() < .45;
    if (f.onGround && Math.random() < .12) { f.vy = -820; }
  }
  f.guarding = !!f.aiGuard && f.onGround;
  f.vx = f.guarding ? 0 : f.aiMove * 250;
  if (f.aiMove) f.facing = f.aiMove;
  if (adx < 80) f.facing = Math.sign(dx) || f.facing;
  if (!f.guarding && adx < 78 && f.slashCd <= 0 && Math.random() < .5)
    doSlash(du, f, foe);
}

function spark(du, x, y, c) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 140;
    du.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                        t: .3 + Math.random() * .25, c, r: 2 + Math.random() * 3 });
  }
}

export function updateDuel(du, dt) {
  du.t += dt;
  du.shake = Math.max(0, du.shake - dt * 30);
  if (du.freeze > 0) { du.freeze -= dt; return; }
  if (du.introT > 0) { du.introT -= dt; return; }

  // human takes over P2 on its keys
  if (du.p2ai && Object.values(P2_KEYS).some(k => pressed[k])) du.p2ai = false;

  if (!du.winner) {
    du.time -= dt;
    controlFighter(du, du.f1, du.f2, P1_KEYS, dt);
    if (du.p2ai) aiFighter(du, du.f2, du.f1, dt);
    else controlFighter(du, du.f2, du.f1, P2_KEYS, dt);
  } else {
    du.f1.vx = 0; du.f2.vx = 0;
    du.doneT += dt;
  }

  for (const f of [du.f1, du.f2]) {
    f.slashCd -= dt; f.inv = Math.max(0, f.inv - dt);
    f.hitFlash = Math.max(0, f.hitFlash - dt);
    f.animTimer += dt;
    if (f.action && (f.actionT -= dt) <= 0) f.action = null;
    const wasAir = !f.onGround;
    stepPhysics(f, dt, ARENA.platforms, ARENA.pits);
    if (wasAir && f.onGround) f.squash = .14;
    f.squash = Math.max(0, f.squash - dt);
    f.x = clamp(f.x, 10, W - 10 - f.w);
  }

  for (const h of du.hits) h.t -= dt;
  du.hits = du.hits.filter(h => h.t > 0);
  for (const p of du.particles) {
    p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
  }
  du.particles = du.particles.filter(p => p.t > 0);
  for (const p of du.popups) { p.y += p.vy * dt; p.t -= dt; }
  du.popups = du.popups.filter(p => p.t > 0);

  if (!du.winner) {
    if (du.f1.hp <= 0) endRound(du, du.f2);
    else if (du.f2.hp <= 0) endRound(du, du.f1);
    else if (du.time <= 0)
      endRound(du, du.f1.hp === du.f2.hp ? null
             : du.f1.hp > du.f2.hp ? du.f1 : du.f2);
  }
}

function endRound(du, winner) {
  du.winner = winner || 'draw';
  du.doneT = 0;
  stopMusic(); sfx.victory();
}

export function restartDuel(du, game) {
  Object.assign(du, makeDuel(game), { p2ai: du.p2ai });
}

// ---------------- drawing ----------------
function fighterSprite(f) {
  if (f.action === 'slash') return `${f.who}_slash`;
  if (!f.onGround) return `${f.who}_jump`;
  if (f.guarding) return `${f.who}_guard`;
  if (Math.abs(f.vx) > 10)
    return `${f.who}_run${Math.floor(f.animTimer * 9) % 2 + 1}`;
  return `${f.who}_idle`;
}

export function drawDuel(ctx, du, images) {
  camera.x = du.shake ? (Math.random() - .5) * du.shake : 0;
  // sunset arena backdrop
  const bg = images['bg_sunset'];
  if (bg) {
    const s = (GROUND_Y + 30) / bg.height;
    for (let x = 0; x < W; x += bg.width * s)
      ctx.drawImage(bg, x - camera.x * .2, 0, bg.width * s, bg.height * s);
  }
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  g.addColorStop(0, ARENA.groundTop); g.addColorStop(1, ARENA.groundBottom);
  ctx.fillStyle = g; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 46) {
    ctx.beginPath(); ctx.moveTo(x - camera.x, GROUND_Y);
    ctx.lineTo(x - camera.x, H); ctx.stroke();
  }
  for (const p of ARENA.platforms) {
    ctx.fillStyle = ARENA.platColor;
    ctx.fillRect(p.x - camera.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(p.x - camera.x, p.y, p.w, 4);
  }

  for (const f of [du.f2, du.f1]) {
    const blink = f.inv > .1 && Math.floor(f.inv * 12) % 2 === 0;
    let hgt = 86;
    if (f.guarding) hgt = 74;
    if (f.squash > 0) hgt *= .8 + .2 * (1 - f.squash / .14);
    drawSprite(ctx, fighterSprite(f), f.x + f.w / 2, f.y + f.h + 2, hgt,
               f.facing, blink ? .4 : 1, 0,
               f.hitFlash > 0 ? { color: '#fff', a: .6 } : null);
  }

  for (const p of du.particles) {
    ctx.globalAlpha = Math.min(1, p.t * 2);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - camera.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;
  for (const p of du.popups) {
    ctx.globalAlpha = Math.min(1, p.t * 1.6);
    ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x - camera.x, p.y);
  }
  ctx.globalAlpha = 1;

  // HUD: two hp bars + timer
  drawHpBar(ctx, du.f1, 30, false);
  drawHpBar(ctx, du.f2, W - 30 - 300, true);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px monospace';
  ctx.fillText(`${Math.max(0, Math.ceil(du.time))}`, W / 2, 44);
  if (du.p2ai && !du.winner) {
    ctx.fillStyle = '#8a86b8'; ctx.font = '12px monospace';
    ctx.fillText('P2 is AI — press an ARROW key (move) / K (slash) / L (guard) to take over',
                 W / 2, 64);
  }

  if (du.introT > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, H / 2 - 70, W, 130);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 38px Georgia, serif';
    ctx.fillText(du.introT > .7 ? 'PLAZA DE DUELO' : 'FIGHT!', W / 2, H / 2 - 14);
    ctx.fillStyle = '#dfd7ff'; ctx.font = '14px monospace';
    ctx.fillText('P1: A/D move · W jump · F slash · G guard      P2: ARROWS · K slash · L guard',
                 W / 2, H / 2 + 24);
  }

  if (du.winner) {
    const a = clamp(du.doneT, 0, 1);
    ctx.fillStyle = `rgba(8,4,20,${a * .7})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 46px Georgia, serif';
    ctx.fillText(du.winner === 'draw' ? 'DRAW!'
                 : `${du.winner.who.toUpperCase()} WINS!`, W / 2, H / 2 - 30);
    if (du.winner !== 'draw')
      drawSprite(ctx, `${du.winner.who}_victory`, W / 2, H / 2 + 110, 110, 1);
    ctx.fillStyle = '#8a86b8'; ctx.font = '14px monospace';
    ctx.fillText('ENTER — back to the map      R — rematch', W / 2, H - 18);
    ctx.globalAlpha = 1;
  }
}

function drawHpBar(ctx, f, x, flip) {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, 22, 300, 26);
  const frac = clamp(f.hp / MAX_HP, 0, 1);
  ctx.fillStyle = frac > .5 ? '#8fe98f' : frac > .25 ? '#ffd24a' : '#ff5a45';
  if (flip) ctx.fillRect(x + 300 * (1 - frac) + 3, 25, 294 * frac, 20);
  else ctx.fillRect(x + 3, 25, 294 * frac, 20);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.strokeRect(x, 22, 300, 26);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace';
  ctx.textAlign = flip ? 'right' : 'left';
  ctx.fillText(f.who.toUpperCase(), flip ? x + 296 : x + 4, 62);
}
