// Player character: movement, sword / gun / grenade combat.

import { GROUND_Y, stepPhysics, drawSprite, camera, W, input, clamp } from './engine.js';
import { sfx } from './audio.js';

export const MAX_HP = 8;

export function makePlayer(who, x = 100) {
  return {
    kind: 'player', who,                    // 'samuel' | 'yossi'
    x, y: GROUND_Y - 64, w: 38, h: 64,
    vx: 0, vy: 0, facing: 1, onGround: true,
    hp: MAX_HP, ammo: 30, nades: 3, score: 0,
    inv: 0,                                  // invulnerability timer
    animTimer: 0, action: null, actionT: 0,  // action: slash|shoot|throw
    swordCd: 0, gunCd: 0, nadeCd: 0,
    dead: false, remote: false,
  };
}

export function updatePlayer(p, dt, game, controlled) {
  if (p.dead) return;
  const SPEED = 300, JUMP = 880;

  p.inv = Math.max(0, p.inv - dt);
  p.swordCd -= dt; p.gunCd -= dt; p.nadeCd -= dt;
  p.animTimer += dt;
  if (p.action && (p.actionT -= dt) <= 0) p.action = null;

  if (controlled) {
    p.vx = 0;
    if (input.left())  { p.vx = -SPEED; p.facing = -1; }
    if (input.right()) { p.vx =  SPEED; p.facing =  1; }
    if (input.jump() && p.onGround) { p.vy = -JUMP; sfx.jump(); }
    if (input.sword() && p.swordCd <= 0) doSlash(p, game);
    if (input.gun()   && p.gunCd   <= 0) doShoot(p, game);
    if (input.nade()  && p.nadeCd  <= 0) doNade(p, game);
  }

  stepPhysics(p, dt, game.level.platforms);
  p.x = clamp(p.x, camera.x > 20 ? camera.x - 10 : 0, game.arena ? game.arenaMax : game.level.length - p.w);
}

export function doSlash(p, game) {
  p.swordCd = .35; p.action = 'slash'; p.actionT = .28;
  sfx.slash();
  const hb = { x: p.facing > 0 ? p.x + p.w - 6 : p.x - 56, y: p.y - 8, w: 62, h: p.h + 14 };
  game.meleeHits.push({ ...hb, dmg: 3, owner: p, t: .12 });
}

export function doShoot(p, game) {
  if (p.ammo <= 0) return;
  p.ammo--; p.gunCd = .22; p.action = 'shoot'; p.actionT = .2;
  sfx.shoot();
  game.bullets.push({
    x: p.x + p.w / 2 + p.facing * 26, y: p.y + p.h * .42,
    vx: p.facing * 760, vy: 0, w: 12, h: 5, dmg: 1, from: 'player', life: 1.4,
  });
}

export function doNade(p, game) {
  if (p.nades <= 0) return;
  p.nades--; p.nadeCd = .8; p.action = 'throw'; p.actionT = .3;
  game.nades.push({
    x: p.x + p.w / 2, y: p.y + 10, vx: p.facing * 420, vy: -560,
    w: 14, h: 14, t: 1.4, from: 'player',
  });
}

export function hurtPlayer(p, dmg, game) {
  if (p.inv > 0 || p.dead) return;
  p.hp -= dmg; p.inv = 1.2;
  sfx.hurt();
  camera.shake = 6;
  if (p.hp <= 0) { p.hp = 0; p.dead = true; p.deadT = 0; }
}

const RUN_FPS = 9;

export function playerSprite(p) {
  if (p.action === 'slash') return `${p.who}_slash`;
  if (p.action === 'shoot') return `${p.who}_shoot`;
  if (p.action === 'throw') return `${p.who}_throw`;
  if (!p.onGround) return `${p.who}_jump`;
  if (Math.abs(p.vx) > 10)
    return Math.floor(p.animTimer * RUN_FPS) % 2 ? `${p.who}_run1` : `${p.who}_run2`;
  return `${p.who}_idle`;
}

export function drawPlayer(ctx, p) {
  if (p.dead) {
    ctx.save();
    ctx.globalAlpha = .6;
    drawSprite(ctx, `${p.who}_idle`, p.x + p.w / 2, GROUND_Y + 6, 46, p.facing);
    ctx.restore();
    return;
  }
  const blink = p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0;
  const bob = Math.abs(p.vx) > 10 && p.onGround ? Math.sin(p.animTimer * 18) * 2 : 0;
  drawSprite(ctx, playerSprite(p), p.x + p.w / 2, p.y + p.h + 2 + bob, 86, p.facing,
             blink ? .35 : 1);
  // name tag
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = p.who === 'samuel' ? '#9ecbff' : '#b6ff9e';
  ctx.fillText(p.who.toUpperCase(), p.x + p.w / 2 - camera.x, p.y - 28);
}

// ---- AI companion (solo mode): follows, shoots nearest enemy, can't die ----
export function updateCompanion(c, dt, game) {
  const lead = game.me;
  c.inv = Math.max(0, c.inv - dt);
  c.gunCd -= dt; c.swordCd -= dt; c.animTimer += dt;
  if (c.action && (c.actionT -= dt) <= 0) c.action = null;

  const targetX = lead.x - 70 * lead.facing;
  const dx = targetX - c.x;
  c.vx = Math.abs(dx) > 24 ? Math.sign(dx) * 290 : 0;
  if (c.vx) c.facing = Math.sign(c.vx);
  if (c.onGround && (lead.y + lead.h < c.y - 40 || (Math.abs(dx) > 260))) c.vy = -860;

  // auto-attack nearest enemy
  let best = null, bd = 520;
  for (const e of game.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.abs(e.x - c.x);
    if (d < bd) { bd = d; best = e; }
  }
  if (best) {
    c.facing = best.x > c.x ? 1 : -1;
    if (bd < 70 && c.swordCd <= 0) doSlash(c, game);
    else if (c.gunCd <= 0 && bd < 500) {
      c.gunCd = .5; c.action = 'shoot'; c.actionT = .2;
      sfx.shoot();
      game.bullets.push({ x: c.x + c.w / 2, y: c.y + c.h * .42, vx: c.facing * 700, vy: 0,
                          w: 12, h: 5, dmg: 1, from: 'player', life: 1.2 });
    }
  }
  stepPhysics(c, dt, game.level.platforms);
  if (c.hp <= 0) { c.hp = MAX_HP; c.inv = 2; c.x = lead.x - 60; c.y = lead.y - 40; } // respawn
}
