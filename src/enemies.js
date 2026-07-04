// Enemy definitions, AI, and the two bosses.

import { GROUND_Y, stepPhysics, drawSprite, camera, W, dist } from './engine.js';
import { sfx } from './audio.js';

export const TYPES = {
  //             hp  spd  dmg  h(px) behavior      score
  crusader:  { hp: 6, spd: 70,  dmg: 2, size: 84,  ai: 'patrol', score: 200 },
  jihadist:  { hp: 4, spd: 150, dmg: 1, size: 80,  ai: 'chase',  score: 150 },
  gargoyle:  { hp: 3, spd: 120, dmg: 1, size: 66,  ai: 'flyer',  score: 250 },
  inca:      { hp: 4, spd: 60,  dmg: 1, size: 82,  ai: 'shooter',score: 200 },
  supay:     { hp: 5, spd: 170, dmg: 2, size: 78,  ai: 'chase',  score: 250 },
  condor:    { hp: 3, spd: 140, dmg: 1, size: 70,  ai: 'flyer',  score: 250 },
  troll:     { hp: 8, spd: 55,  dmg: 2, size: 96,  ai: 'patrol', score: 300 },
  nacken:    { hp: 4, spd: 0,   dmg: 1, size: 76,  ai: 'shooter',score: 300 },
};

let nextId = 1;

export function makeEnemy(type, x, y = null) {
  const t = TYPES[type];
  const h = t.size * .78;
  return {
    kind: 'enemy', id: nextId++, type, ...structuredClone(t),
    x, w: t.size * .5, h,
    y: y !== null ? y : GROUND_Y - h,
    vx: 0, vy: 0, facing: -1, onGround: false,
    baseY: y !== null ? y : GROUND_Y - h - 130,
    phase: Math.random() * Math.PI * 2,
    atkCd: 1 + Math.random(), hitFlash: 0, animT: Math.random() * 9,
  };
}

export function updateEnemy(e, dt, game) {
  const p = nearestPlayer(e, game);
  e.hitFlash = Math.max(0, e.hitFlash - dt);
  e.animT += dt;
  e.atkCd -= dt;
  const dx = p ? p.x - e.x : 0;

  switch (e.ai) {
    case 'patrol':
      if (p && Math.abs(dx) < 340) e.facing = Math.sign(dx) || -1;
      e.vx = e.facing * e.spd * (p && Math.abs(dx) < 340 ? 1.6 : 1);
      if (e.x < 30) e.facing = 1;
      stepPhysics(e, dt, game.level.platforms);
      break;
    case 'chase':
      if (p) {
        e.facing = Math.sign(dx) || 1;
        e.vx = e.facing * e.spd;
        if (e.onGround && p.y + p.h < e.y - 30 && Math.random() < .02) e.vy = -750;
      }
      stepPhysics(e, dt, game.level.platforms);
      break;
    case 'flyer': {
      // hover around baseY, swoop at player periodically
      e.phase += dt * 2.2;
      if (e.swoop) {
        e.x += e.svx * dt; e.y += e.svy * dt;
        if ((e.swoopT -= dt) <= 0 || e.y > GROUND_Y - e.h) e.swoop = false;
      } else {
        e.y += (e.baseY + Math.sin(e.phase) * 34 - e.y) * dt * 3;
        if (p) e.facing = Math.sign(dx) || 1;
        e.x += (p ? Math.sign(dx) : -1) * e.spd * .5 * dt;
        if (p && Math.abs(dx) < 240 && e.atkCd <= 0) {
          e.swoop = true; e.swoopT = .8; e.atkCd = 2.6;
          const d = Math.max(60, dist(e, p));
          e.svx = (p.x - e.x) / d * 420; e.svy = (p.y - e.y) / d * 420;
        }
      }
      break;
    }
    case 'shooter':
      if (p) e.facing = Math.sign(dx) || 1;
      e.vx = p && Math.abs(dx) > 420 ? e.facing * Math.max(e.spd, 40)
           : p && Math.abs(dx) < 180 ? -e.facing * Math.max(e.spd, 40) : 0;
      stepPhysics(e, dt, game.level.platforms);
      if (p && Math.abs(dx) < 560 && e.atkCd <= 0 && game.isHost) {
        e.atkCd = 2.2;
        game.bullets.push({
          x: e.x + e.w / 2, y: e.y + e.h * .35,
          vx: e.facing * 380, vy: 0, w: 14, h: 6, dmg: 1, from: 'enemy', life: 2.2,
          color: e.type === 'nacken' ? '#7fd8ff' : '#ffd24a',
        });
      }
      break;
  }
}

function nearestPlayer(e, game) {
  let best = null, bd = 1e9;
  for (const pl of game.players) {
    if (!pl || pl.dead) continue;
    const d = Math.abs(pl.x - e.x);
    if (d < bd) { bd = d; best = pl; }
  }
  return best;
}

export function drawEnemy(ctx, e) {
  const bob = e.ai === 'flyer' ? Math.sin(e.animT * 6) * 3 : 0;
  drawSprite(ctx, e.type, e.x + e.w / 2, e.y + e.h + 2 + bob, e.size,
             e.facing, e.hitFlash > 0 ? .5 : 1);
  if (e.hp < TYPES[e.type].hp) {           // mini health bar
    const sx = e.x + e.w / 2 - camera.x;
    ctx.fillStyle = '#300'; ctx.fillRect(sx - 20, e.y - 12, 40, 5);
    ctx.fillStyle = '#e33';
    ctx.fillRect(sx - 20, e.y - 12, 40 * e.hp / TYPES[e.type].hp, 5);
  }
}

/* ------------------------- BOSSES ------------------------- */

export function makeBoss(type, arenaX) {
  const cfg = type === 'boss_alhambra'
    ? { hp: 70, size: 300, name: 'DJINN SULTAN OF THE ALHAMBRA' }
    : { hp: 90, size: 320, name: 'STONE COLOSSUS OF CUSCO' };
  const h = cfg.size * .8;
  return {
    kind: 'boss', id: nextId++, type, ...cfg, maxHp: cfg.hp,
    x: arenaX, y: GROUND_Y - h, w: cfg.size * .45, h,
    vx: 0, vy: 0, facing: -1, onGround: true,
    state: 'enter', t: 2, atkCd: 2, hitFlash: 0, animT: 0, phase: 0,
  };
}

export function updateBoss(b, dt, game) {
  b.hitFlash = Math.max(0, b.hitFlash - dt);
  b.animT += dt;
  b.t -= dt;
  const p = nearestPlayer(b, game);
  if (!p) return;
  b.facing = Math.sign(p.x - b.x) || -1;
  const enraged = b.hp < b.maxHp * .45;

  if (b.type === 'boss_alhambra') {
    // Djinn: hovers in sine wave, volleys fireballs, dashes when close.
    b.y = GROUND_Y - b.h - 40 + Math.sin(b.animT * 1.5) * 30;
    if (b.state === 'enter' && b.t <= 0) { b.state = 'float'; b.t = 2; }
    else if (b.state === 'float') {
      b.x += Math.sign(p.x - b.x) * 60 * dt;
      if (b.t <= 0) {
        if (Math.abs(p.x - b.x) < 220) { b.state = 'dash'; b.t = .6; b.vx = b.facing * 620; }
        else { b.state = 'volley'; b.t = enraged ? 1.6 : 1.1; b.shotT = 0; }
      }
    } else if (b.state === 'volley') {
      b.shotT -= dt;
      if (b.shotT <= 0 && game.isHost) {
        b.shotT = enraged ? .22 : .38;
        const ang = Math.atan2((p.y + p.h / 2) - (b.y + b.h * .3), p.x - b.x) + (Math.random() - .5) * .35;
        game.bullets.push({ x: b.x + b.w / 2, y: b.y + b.h * .3,
          vx: Math.cos(ang) * 330, vy: Math.sin(ang) * 330,
          w: 18, h: 18, dmg: 1, from: 'enemy', life: 3, color: '#ff8830', fire: true });
      }
      if (b.t <= 0) { b.state = 'float'; b.t = enraged ? 1.2 : 2; }
    } else if (b.state === 'dash') {
      b.x += b.vx * dt;
      if (b.t <= 0) { b.state = 'float'; b.t = 1.6; b.vx = 0; }
    }
  } else {
    // Colossus: walks, leaps with shockwave, hurls stones.
    if (b.state === 'enter' && b.t <= 0) { b.state = 'walk'; b.t = 2.2; }
    else if (b.state === 'walk') {
      b.vx = b.facing * (enraged ? 130 : 80);
      stepPhysics(b, dt, game.level.platforms);
      if (b.t <= 0) {
        if (Math.random() < .5) { b.state = 'leap'; b.vy = -900; b.vx = b.facing * 260; }
        else { b.state = 'hurl'; b.t = enraged ? 1.8 : 1.2; b.shotT = 0; b.vx = 0; }
      }
    } else if (b.state === 'leap') {
      stepPhysics(b, dt, game.level.platforms);
      if (b.onGround && b.vy === 0) {
        camera.shake = 14; sfx.boom();
        if (game.isHost) {
          for (const s of [-1, 1])
            game.bullets.push({ x: b.x + b.w / 2, y: GROUND_Y - 18, vx: s * 430, vy: 0,
              w: 40, h: 18, dmg: 2, from: 'enemy', life: 1.1, color: '#c9b58a', wave: true });
        }
        b.state = 'walk'; b.t = 2.4; b.vx = 0;
      }
    } else if (b.state === 'hurl') {
      b.shotT -= dt;
      if (b.shotT <= 0 && game.isHost) {
        b.shotT = enraged ? .5 : .8;
        game.bullets.push({ x: b.x + b.w / 2, y: b.y + 30,
          vx: b.facing * (260 + Math.random() * 160), vy: -420 - Math.random() * 120,
          w: 22, h: 22, dmg: 2, from: 'enemy', life: 3, color: '#a8977a', grav: true });
      }
      if (b.t <= 0) { b.state = 'walk'; b.t = 2; }
    }
  }
}

export function drawBoss(ctx, b) {
  drawSprite(ctx, b.type, b.x + b.w / 2, b.y + b.h, b.size, b.facing,
             b.hitFlash > 0 ? .55 : 1);
}

export function drawBossBar(ctx, b) {
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(W / 2 - 262, 14, 524, 34);
  ctx.fillStyle = '#511';
  ctx.fillRect(W / 2 - 254, 32, 508, 10);
  ctx.fillStyle = '#e3312f';
  ctx.fillRect(W / 2 - 254, 32, 508 * Math.max(0, b.hp) / b.maxHp, 10);
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(b.name, W / 2, 27);
}
