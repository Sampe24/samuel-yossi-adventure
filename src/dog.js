// Yossi's little yorkie companion. Purely cosmetic: follows her around,
// hops ledges, sits when she rests, barks when she fights.

import { GROUND_Y, stepPhysics, overPit, drawSprite } from './engine.js';

const RUN_FPS = 10;

export function makeDog(x) {
  return { x, y: GROUND_Y - 34, w: 26, h: 34, vx: 0, vy: 0,
           facing: 1, onGround: true, animT: 0, restT: 0, barkT: 0 };
}

export function updateDog(d, dt, game) {
  const owner = game.players.find(p => p && p.who === 'yossi');
  if (!owner) return;
  d.animT += dt;
  d.barkT = Math.max(0, d.barkT - dt);

  // bark along whenever Yossi attacks
  if (owner.action === 'slash' || owner.action === 'shoot') d.barkT = .5;

  const heelX = owner.x - owner.facing * 48;   // trot at her heel
  const dx = heelX - d.x;

  // left too far behind (pit fall, respawn, arena swap) -> catch up instantly
  if (Math.abs(dx) > 700 || d.y > GROUND_Y + 160) {
    d.x = heelX; d.y = Math.min(owner.y, GROUND_Y - d.h); d.vy = 0;
  }

  const run = Math.abs(dx) > 36 && !owner.dead;
  if (run) {
    d.vx = Math.sign(dx) * Math.min(360, 130 + Math.abs(dx) * 1.4);
    d.facing = Math.sign(dx) || d.facing;
    d.restT = 0;
  } else {
    d.vx = 0;
    d.facing = Math.sign(owner.x + owner.w / 2 - (d.x + d.w / 2)) || d.facing;
    d.restT += dt;
  }
  // hop when she's above, or a pit/ledge is coming up
  if (d.onGround && run &&
      (owner.y + owner.h < d.y - 22 ||
       overPit({ x: d.x + d.facing * 40, w: d.w }, game.level.pits))) {
    d.vy = -760;
  }
  stepPhysics(d, dt, game.level.platforms, game.level.pits);
}

export function drawDog(ctx, d) {
  let name = 'dog_idle_0';
  if (!d.onGround) name = 'dog_jump_0';
  else if (Math.abs(d.vx) > 10)
    name = Math.floor(d.animT * RUN_FPS) % 2 ? 'dog_run_0' : 'dog_run_1';
  else if (d.barkT > 0)
    name = Math.floor(d.animT * 8) % 2 ? 'dog_bark_0' : 'dog_bark_1';
  else if (d.restT > 2.5) name = 'dog_sit_0';
  else name = Math.floor(d.animT * 2) % 2 ? 'dog_idle_0' : 'dog_idle_1';
  drawSprite(ctx, name, d.x + d.w / 2, d.y + d.h + 2, 34, d.facing);
}

export const DOG_FRAMES = ['dog_idle_0', 'dog_idle_1', 'dog_run_0',
                           'dog_run_1', 'dog_jump_0', 'dog_sit_0',
                           'dog_bark_0', 'dog_bark_1'];
