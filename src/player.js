// Player character: movement, sword / gun / grenade combat.

import { GROUND_Y, H, stepPhysics, drawSprite, camera, W, input, keys, clamp } from './engine.js';
import { sfx } from './audio.js';

export const MAX_HP = 8;

export function makePlayer(who, x = 100) {
  return {
    kind: 'player', who,                    // 'samuel' | 'yossi'
    x, y: GROUND_Y - 64, w: 38, h: 64,
    vx: 0, vy: 0, facing: 1, onGround: true,
    hp: MAX_HP, ammo: 30, nades: 3, score: 0,
    inv: 0,                                  // invulnerability timer
    animTimer: 0, action: null, actionT: 0,  // action: slash|shoot|throw|roll
    swordCd: 0, gunCd: 0, nadeCd: 0,
    rollT: 0, rollCd: 0, low: false,         // roll / crouch state
    jumps: 0,                                // double-jump counter
    combo: 0, comboT: 0,                     // sword combo chain
    climbing: false,
    dead: false, remote: false,
  };
}

// Shrink/restore the hitbox for crouching and rolling.
function setLowBox(p, on) {
  if (on && !p.low) { p.low = true; p.y += 22; p.h = 42; }
  else if (!on && p.low) { p.low = false; p.y -= 22; p.h = 64; }
}

function findLadder(p, ladders) {
  if (!ladders) return null;
  const cx = p.x + p.w / 2;
  return ladders.find(l => cx > l.x - 8 && cx < l.x + l.w + 8 &&
                           p.y + p.h > l.y + 4 && p.y < l.y + l.h) || null;
}

export function updatePlayer(p, dt, game, controlled) {
  if (p.dead) return;
  const SPEED = 300, JUMP = 880, ROLL_SPEED = 540, CLIMB_SPEED = 190;

  p.inv = Math.max(0, p.inv - dt);
  p.swordCd -= dt; p.gunCd -= dt; p.nadeCd -= dt; p.rollCd -= dt;
  p.comboT = Math.max(0, p.comboT - dt);
  if (p.comboT <= 0) p.combo = 0;
  p.animTimer += dt;
  if (p.action && (p.actionT -= dt) <= 0) p.action = null;

  if (controlled) {
    const dir = input.left() ? -1 : input.right() ? 1 : 0;
    const lad = findLadder(p, game.level.ladders);

    // ---- ladder climbing ----
    if (p.climbing) {
      if (!lad) { p.climbing = false; }
      else {
        setLowBox(p, false);
        p.vx = 0; p.vy = 0;
        if (input.up())   p.y -= CLIMB_SPEED * dt;
        if (input.down()) p.y += CLIMB_SPEED * dt;
        p.x += (lad.x + lad.w / 2 - (p.x + p.w / 2)) * Math.min(1, dt * 12);
        if (p.y + p.h <= lad.y + 2) {           // reached the top
          p.y = lad.y - p.h; p.climbing = false; p.onGround = true; p.jumps = 0;
        } else if (p.y + p.h >= GROUND_Y) {     // reached the bottom
          p.y = GROUND_Y - p.h; p.climbing = false; p.onGround = true; p.jumps = 0;
        }
        if (pressedJumpOff(p)) { p.climbing = false; p.vy = -JUMP * .75; sfx.jump(); }
        if (input.sword() && p.swordCd <= 0) doSlash(p, game);
        p.animTimer += dt;
        return;   // no gravity while climbing
      }
    }

    // grab a ladder: up while overlapping, or down at its top edge
    if (!p.climbing && lad && p.rollT <= 0) {
      const atTop = p.onGround && Math.abs(p.y + p.h - lad.y) < 8;
      if ((input.up() && p.y + p.h > lad.y + 12) || (input.down() && atTop)) {
        setLowBox(p, false);
        p.climbing = true;
        p.y = Math.max(p.y, lad.y - p.h + (atTop ? 14 : 0));
        p.vx = 0; p.vy = 0;
        return;
      }
    }

    // ---- roll (crouch + direction) ----
    if (p.rollT > 0) {
      p.rollT -= dt;
      p.vx = p.facing * ROLL_SPEED;
      p.inv = Math.max(p.inv, .06);           // i-frames while rolling
      if (p.rollT <= 0) p.action = null;
    } else {
      p.vx = 0;
      if (dir) p.facing = dir;
      const crouching = input.down() && p.onGround;
      if (crouching && dir && p.rollCd <= 0) {
        p.rollT = .38; p.rollCd = .85;
        p.action = 'roll'; p.actionT = .38;
        setLowBox(p, true);
        sfx.roll();
      } else if (crouching) {
        setLowBox(p, true);                    // crouch: duck under shots
      } else {
        setLowBox(p, false);
        if (dir) p.vx = dir * SPEED;
      }
      // jump + double jump
      if (input.jump() && !crouching) {
        if (p.onGround) { p.vy = -JUMP; p.jumps = 1; sfx.jump(); }
        else if (p.jumps < 2) { p.vy = -JUMP * .88; p.jumps = 2; sfx.doubleJump(); }
      }
    }

    if (input.sword() && p.swordCd <= 0 && p.rollT <= 0) doSlash(p, game);
    if (input.gun()   && p.gunCd   <= 0 && p.rollT <= 0) doShoot(p, game);
    if (input.nade()  && p.nadeCd  <= 0 && p.rollT <= 0) doNade(p, game);
  }

  stepPhysics(p, dt, game.level.platforms, game.level.pits);
  if (p.onGround) p.jumps = 0;
  p.x = clamp(p.x, camera.x > 20 ? camera.x - 10 : 0, game.arena ? game.arenaMax : game.level.length - p.w);

  // fell into a pit
  if (p.y > H + 60 && !p.dead) {
    p.hp = 0; p.dead = true; p.climbing = false;
    sfx.hurt(); camera.shake = 8;
  }
}

function pressedJumpOff(p) {
  // space always hops off a ladder ('w' is climb-up)
  return input.jump() && keys[' '];
}

export function doSlash(p, game) {
  // 3-hit combo: tap J repeatedly — 3rd hit is a wide, heavy finisher lunge
  p.combo = p.comboT > 0 ? p.combo + 1 : 1;
  const finisher = p.combo >= 3;
  p.comboT = .7;
  p.swordCd = finisher ? .55 : .26;
  p.action = finisher ? 'slash3' : p.combo === 2 ? 'slash2' : 'slash';
  p.actionT = finisher ? .34 : .24;
  sfx.slash(finisher);
  const range = finisher ? 92 : 62;
  const hb = { x: p.facing > 0 ? p.x + p.w - 6 : p.x - range + 6,
               y: p.y - (finisher ? 20 : 8), w: range, h: p.h + (finisher ? 36 : 14) };
  game.meleeHits.push({ ...hb, dmg: finisher ? 6 : 3, owner: p, t: .12 });
  if (finisher) { p.vx = p.facing * 340; p.combo = 0; }
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
  if (p.action === 'roll') return `${p.who}_roll`;
  if (p.climbing) return `${p.who}_climb`;
  if (p.action) return `${p.who}_${p.action}`;   // slash|slash2|slash3|shoot|throw
  if (p.low) return `${p.who}_crouch`;
  if (!p.onGround) return p.jumps >= 2 ? `${p.who}_flip` : `${p.who}_jump`;
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
  const blink = p.inv > .1 && Math.floor(p.inv * 12) % 2 === 0;
  const bob = Math.abs(p.vx) > 10 && p.onGround && p.rollT <= 0
            ? Math.sin(p.animTimer * 18) * 2 : 0;
  let hgt = 86, rot = 0;
  if (p.action === 'roll') {
    hgt = 58;
    rot = Math.PI * 2 * (p.rollT > 0 ? 1 - p.rollT / .38 : (p.animTimer * 2.6) % 1);
  } else if (p.low) {
    hgt = 56;                                  // crouch sprite is naturally low
  } else if (p.action === 'slash3') {
    hgt = 104;                                 // overhead finisher: sword above head
  } else if (p.climbing) {
    hgt = 96;
  } else if (!p.onGround && p.jumps >= 2) {
    hgt = 78;                                  // somersault flip
  }
  drawSprite(ctx, playerSprite(p), p.x + p.w / 2, p.y + p.h + 2 + bob, hgt, p.facing,
             blink ? .35 : 1, rot);
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
  stepPhysics(c, dt, game.level.platforms, game.level.pits);
  if (c.y > H + 60) c.hp = 0;                                    // fell into a pit
  if (c.hp <= 0) { c.hp = MAX_HP; c.inv = 2; c.x = lead.x - 60; c.y = lead.y - 40; c.vy = 0; } // respawn
}
