// Player character: movement, sword / gun / grenade combat.

import { GROUND_Y, H, stepPhysics, drawSprite, camera, W, input, keys, clamp } from './engine.js';
import { sfx } from './audio.js';

export const MAX_HP = 8;

// ---- XP & leveling: kills grant XP; level-ups fully heal and unlock skills ----
export const XP_LEVELS = [0, 1000, 2600, 4800, 7500];   // total XP to reach LV1..LV5
const SKILL_UNLOCKS = {
  2: 'NEW SKILL — CHARGED SHOT: hold K, release to blast!',
  3: 'NEW SKILL — SPIN SLASH: tap J 4x for a whirlwind!',
  4: 'NEW SKILL — PARRY: guard (H) right before a shot reflects it!',
};

export function xpForNext(level) {          // total XP needed to reach level+1
  return level < XP_LEVELS.length ? XP_LEVELS[level]
       : XP_LEVELS[XP_LEVELS.length - 1] + (level - XP_LEVELS.length + 1) * 3200;
}

export function grantXP(p, amount, game) {
  p.xp += amount;
  while (p.xp >= xpForNext(p.level)) {
    p.level++;
    p.hp = MAX_HP;                          // level-up = full heal
    sfx.levelup();
    game.addPopup?.(p.x + p.w / 2, p.y - 34, `LEVEL UP!  LV ${p.level}`, '#ffd24a', true);
    const skill = SKILL_UNLOCKS[p.level];
    game.skillBanner = skill ? { text: skill, t: 3.5 }
                             : { text: `LV ${p.level} — +1 LIFE!`, t: 2.5 };
    if (!skill) game.lives++;
  }
}

export function makePlayer(who, x = 100) {
  return {
    kind: 'player', who,                    // 'samuel' | 'yossi'
    x, y: GROUND_Y - 64, w: 38, h: 64,
    vx: 0, vy: 0, facing: 1, onGround: true,
    hp: MAX_HP, ammo: 30, nades: 3, score: 0,
    xp: 0, level: 1,                         // XP / skill level
    charging: false, chargeT: 0,             // charged-shot state (LV2+)
    guarding: false, guardT: 0,              // guard / parry state
    inv: 0,                                  // invulnerability timer
    animTimer: 0, action: null, actionT: 0,  // action: slash|shoot|throw|roll
    swordCd: 0, gunCd: 0, nadeCd: 0,
    rollT: 0, rollCd: 0, low: false,         // roll / crouch state
    jumps: 0,                                // double-jump counter
    coyoteT: 0, jumpBufT: 0,                 // coyote time + jump-input buffer
    combo: 0, comboT: 0,                     // sword combo chain
    climbing: false,
    squash: 0, respawnT: null,               // landing squash / respawn countdown
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
  p.jumpBufT = Math.max(0, p.jumpBufT - dt);
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

    // ---- guard: hold H to block shots (LV4: parry window right after raising) ----
    const wantGuard = input.guard() && p.onGround && p.rollT <= 0;
    if (wantGuard && !p.guarding) { p.guardT = 0; sfx.guard(); }
    p.guarding = wantGuard;

    // ---- roll (crouch + direction) ----
    if (p.guarding) {
      p.guardT += dt;
      setLowBox(p, false);
      p.vx = 0;
      if (dir) p.facing = dir;               // can turn while guarding
    } else if (p.rollT > 0) {
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
        dust(p, game, 5);
      } else if (crouching) {
        setLowBox(p, true);                    // crouch: duck under shots
      } else {
        setLowBox(p, false);
        if (dir) p.vx = dir * SPEED;
      }
      // jump + double jump, with input buffering + coyote time.
      // Buffer the press (~0.12s) so a jump keyed just before landing still
      // fires; coyoteT (~0.1s, set on leaving ground) lets a ground jump
      // register just after walking off a ledge instead of eating the
      // weaker double-jump.
      if (input.jump() && !crouching) p.jumpBufT = .12;
      if (p.jumpBufT > 0 && !crouching) {
        if (p.onGround || p.coyoteT > 0) {
          p.vy = -JUMP; p.jumps = 1; p.coyoteT = 0; p.jumpBufT = 0;
          sfx.jump(); dust(p, game, 4);
        } else if (p.jumps < 2) {
          p.vy = -JUMP * .88; p.jumps = 2; p.jumpBufT = 0;
          sfx.doubleJump(); dust(p, game, 6);
        }
      }
    }

    if (input.sword() && p.swordCd <= 0 && p.rollT <= 0 && !p.guarding) doSlash(p, game);
    // gun: LV1 = hold to autofire; LV2+ = tap fires, keep holding to charge a blast
    if (p.level < 2) {
      if (input.gunHold() && p.gunCd <= 0 && p.rollT <= 0 && !p.guarding) doShoot(p, game);
    } else {
      if (input.gunPress() && p.gunCd <= 0 && p.rollT <= 0 && !p.guarding) {
        doShoot(p, game);
        if (p.ammo > 0) { p.charging = true; p.chargeT = 0; }
      }
      if (p.charging) {
        if (input.gunHold() && p.rollT <= 0 && !p.guarding) {
          p.chargeT = Math.min(1.1, p.chargeT + dt);
          if (p.chargeT > .35) chargeGlow(p, game, dt);
        } else {
          if (p.chargeT >= .5) doChargedShot(p, game);
          p.charging = false; p.chargeT = 0;
        }
      }
    }
    if (input.nade()  && p.nadeCd  <= 0 && p.rollT <= 0 && !p.guarding) doNade(p, game);
  }

  const wasAir = !p.onGround, fallVy = p.vy;
  stepPhysics(p, dt, game.level.platforms, game.level.pits);
  p.squash = Math.max(0, p.squash - dt);
  if (wasAir && p.onGround && fallVy > 620) {          // hard landing: squash + dust
    p.squash = .16;
    dust(p, game, Math.min(10, 3 + fallVy / 200));
  }
  if (p.onGround) { p.jumps = 0; p.coyoteT = .1; }
  else p.coyoteT = Math.max(0, p.coyoteT - dt);
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

function dust(p, game, n) {
  for (let i = 0; i < n; i++)
    game.particles.push({
      x: p.x + p.w / 2 + (Math.random() - .5) * p.w,
      y: p.y + p.h - 3,
      vx: (Math.random() - .5) * 160, vy: -30 - Math.random() * 70,
      t: .28 + Math.random() * .2, c: 'rgba(210,195,165,.85)', r: 3 + Math.random() * 3,
    });
}

export function doSlash(p, game) {
  // combo: tap J repeatedly — 3rd hit is a heavy finisher lunge;
  // at LV3+ a 4th tap unleashes a 360° SPIN SLASH hitting both sides
  p.combo = p.comboT > 0 ? p.combo + 1 : 1;
  const spin = p.level >= 3 && p.combo >= 4;
  const finisher = !spin && p.combo >= 3;
  p.comboT = .7;
  if (spin) {
    p.swordCd = .6; p.action = 'spin'; p.actionT = .38; p.combo = 0;
    sfx.slash(true);
    const range = 96;
    game.meleeHits.push({ x: p.x - range, y: p.y - 24, w: p.w + range * 2,
                          h: p.h + 40, dmg: 8, owner: p, t: .16 });
    return;
  }
  p.swordCd = finisher ? .55 : .26;
  p.action = finisher ? 'slash3' : p.combo === 2 ? 'slash2' : 'slash';
  p.actionT = finisher ? .34 : .24;
  sfx.slash(finisher);
  const range = finisher ? 92 : 62;
  const hb = { x: p.facing > 0 ? p.x + p.w - 6 : p.x - range + 6,
               y: p.y - (finisher ? 20 : 8), w: range, h: p.h + (finisher ? 36 : 14) };
  game.meleeHits.push({ ...hb, dmg: finisher ? 6 : 3, owner: p, t: .12 });
  if (finisher) { p.vx = p.facing * 340; if (p.level < 3) p.combo = 0; }
}

function chargeGlow(p, game, dt) {
  if (Math.random() < dt * 30) {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 14;
    game.particles.push({
      x: p.x + p.w / 2 + Math.cos(a) * r, y: p.y + p.h * .45 + Math.sin(a) * r,
      vx: -Math.cos(a) * 90, vy: -Math.sin(a) * 90 - 700 * dt,
      t: .25, c: '#7fd8ff', r: 2 + Math.random() * 2,
    });
  }
}

export function doChargedShot(p, game) {
  if (p.ammo <= 0) return;
  const full = p.chargeT >= 1.05;
  p.ammo--; p.gunCd = .38; p.action = 'shoot'; p.actionT = .25;
  p.lastShotCharged = true;                  // so guests replicate it as charged
  sfx.chargeShot(full);
  camera.shake = full ? 6 : 3;
  game.bullets.push({
    x: p.x + p.w / 2 + p.facing * 26, y: p.y + p.h * .42,
    vx: p.facing * 920, vy: 0, w: full ? 26 : 18, h: full ? 18 : 12,
    dmg: full ? 6 : 3, from: 'player', life: 1.6,
    pierce: true, hitIds: [], fire: true, color: full ? '#7fd8ff' : '#aee6ff',
  });
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
  if (p.guarding) dmg = Math.max(1, dmg - 1);   // guard chips contact damage
  p.hp -= dmg; p.inv = 1.2;
  sfx.hurt();
  camera.shake = 6;
  if (p.hp <= 0) { p.hp = 0; p.dead = true; p.deadT = 0; }
}

const RUN_FPS = 9;

export function playerSprite(p) {
  if (p.action === 'roll') return `${p.who}_roll`;
  if (p.climbing) return `${p.who}_climb`;
  if (p.guarding) return `${p.who}_guard`;       // braced sword-block stance
  if (p.action) return `${p.who}_${p.action}`;   // slash|spin|parry|shoot|throw...
  if (p.charging && p.chargeT > .2) return `${p.who}_charge`;
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
  } else if (p.action === 'spin') {
    hgt = 92;                                  // whirlwind: full 360° blade spin
    rot = Math.PI * 2 * (1 - Math.max(0, p.actionT) / .38);
  } else if (p.action === 'parry') {
    hgt = 94;                                  // sword flung up deflecting the shot
  } else if (p.guarding) {
    hgt = 74;                                  // braced sword-block stance
  } else if (p.climbing) {
    hgt = 96;
  } else if (!p.onGround && p.jumps >= 2) {
    hgt = 78;                                  // somersault flip
  }
  if (p.squash > 0) hgt *= .78 + .22 * (1 - p.squash / .16);   // landing squash
  drawSprite(ctx, playerSprite(p), p.x + p.w / 2, p.y + p.h + 2 + bob, hgt, p.facing,
             blink ? .35 : 1, rot);
  const sx = p.x + p.w / 2 - camera.x;
  // guard shield arc (cyan while the LV4 parry window is open)
  if (p.guarding) {
    const parryWin = p.level >= 4 && p.guardT < .18;
    ctx.save();
    ctx.strokeStyle = parryWin ? 'rgba(127,216,255,.95)' : 'rgba(255,215,106,.85)';
    ctx.lineWidth = 5;
    const mid = p.facing > 0 ? 0 : Math.PI;
    ctx.beginPath();
    ctx.arc(sx, p.y + p.h * .5, 36, mid - 1.05, mid + 1.05);
    ctx.stroke();
    ctx.restore();
  }
  // charged-shot meter above the head
  if (p.charging && p.chargeT > .35) {
    const full = p.chargeT >= 1.05;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(sx - 22, p.y - 46, 44, 7);
    ctx.fillStyle = full ? '#7fd8ff' : '#aee6ff';
    ctx.fillRect(sx - 20, p.y - 45, 40 * Math.min(1, p.chargeT / 1.05), 5);
  }
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
