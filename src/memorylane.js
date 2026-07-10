// MEMORY LANE — a playable cutscene through Samuel & Yossi's real story.
// No enemies, no HUD: the two of them (and Tonito the yorkie) walk together
// through four memories, each painted as its own background scene:
//   1. the night they met at Corazón Latino
//   2. their first Christmas & New Year under Granada's lights
//   3. their first Semana Santa procession
//   4. Tonito's park at the Fuente del Triunfo, resting by the water
// A/D walks, and at the end of the lane they sit down by the fountains
// while a tired little Tonito dozes between them.

import { W, H, GROUND_Y, keys, pressed, drawSprite, drawSegmentedBackground,
         camera, clamp } from './engine.js';
import { playSong, stopMusic, sfx } from './audio.js';

const SCENE_W = 1400;                       // world width per memory
const SCENES = [
  { bg: 'bg_mem_meet',
    title: 'THE NIGHT WE MET',
    sub: 'one dance at Corazón Latino was all it took',
    tint: 'rgba(40,10,60,.22)', spark: '#ff9ad8' },
  { bg: 'bg_mem_navidad',
    title: 'OUR FIRST CHRISTMAS & NEW YEAR',
    sub: 'all the lights of Granada, and we only saw each other',
    tint: 'rgba(20,16,50,.18)', spark: '#ffe9a8' },
  { bg: 'bg_mem_pascua',
    title: 'OUR FIRST SEMANA SANTA',
    sub: 'candles, drums, and your hand in mine',
    tint: 'rgba(16,10,30,.22)', spark: '#ffd76a' },
  { bg: 'bg_gr_triunfo',                     // same artwork as the Granada
    title: "TONITO'S PARK — FUENTE DEL TRIUNFO",   // level: it IS the same place
    sub: 'resting by the water, taking care of our sleepy little friend',
    tint: 'rgba(255,240,180,.06)', spark: '#aee9ff' },
];
const LENGTH = SCENE_W * SCENES.length;
const REST_X = LENGTH - 420;                // where the story sits down

export function makeMemoryLane(game) {
  playSong('ending');
  const lead = game.myWho, partner = lead === 'samuel' ? 'yossi' : 'samuel';
  return {
    lead: { who: lead, x: 120, facing: 1, animT: 0 },
    partner: { who: partner, x: 60, facing: 1, animT: 0 },
    dog: { x: 20, facing: 1, animT: 0, vx: 0 },
    t: 0, resting: false, restT: 0, sparks: [],
    scene: 0, captionT: 0,
  };
}

export function updateMemoryLane(m, dt) {
  m.t += dt;

  if (!m.resting) {
    const dir = (keys['a'] || keys['arrowleft']) ? -1
              : (keys['d'] || keys['arrowright']) ? 1 : 0;
    m.lead.x = clamp(m.lead.x + dir * 210 * dt, 60, LENGTH - 80);
    if (dir) { m.lead.facing = dir; m.lead.animT += dt; }

    // partner walks hand-in-hand just behind; Tonito trots at their heels
    follow(m.partner, m.lead.x - m.lead.facing * 52, dt, 230);
    follow(m.dog, m.partner.x - m.partner.facing * 44, dt, 300);

    if (m.lead.x >= REST_X) {
      m.resting = true;
      sfx.pickup();
    }
  } else {
    m.restT += dt;
    // everyone settles by the water
    approach(m.lead, REST_X + 40, dt);
    approach(m.partner, REST_X - 40, dt);
    approach(m.dog, REST_X, dt);
    m.lead.facing = -1; m.partner.facing = 1;
  }

  // scene index + caption timing
  const s = clamp(Math.floor((m.lead.x + 200) / SCENE_W), 0, SCENES.length - 1);
  if (s !== m.scene) { m.scene = s; m.captionT = 0; }
  m.captionT += dt;

  // drifting memory sparks
  if (Math.random() < dt * 14) {
    m.sparks.push({ x: camera.x + Math.random() * W, y: H - 60 - Math.random() * 60,
                    vy: -14 - Math.random() * 22, t: 3.5,
                    c: SCENES[m.scene].spark });
  }
  for (const p of m.sparks) { p.y += p.vy * dt; p.t -= dt; }
  m.sparks = m.sparks.filter(p => p.t > 0);

  // camera follows the walk
  const want = clamp(m.lead.x - W / 2, 0, LENGTH - W);
  camera.x += (want - camera.x) * Math.min(1, dt * 6);

  if (m.resting && m.restT > 2 && pressed['enter']) {
    stopMusic();
    return 'exit';
  }
  return null;
}

function follow(e, targetX, dt, speed) {
  const dx = targetX - e.x;
  if (Math.abs(dx) > 12) {
    const v = Math.sign(dx) * Math.min(speed, Math.abs(dx) * 3);
    e.x += v * dt;
    e.facing = Math.sign(dx) || e.facing;
    e.animT += dt; e.moving = true;
  } else { e.moving = false; }
}

function approach(e, targetX, dt) {
  follow(e, targetX, dt, 160);
}

// ---------------- drawing ----------------
export function drawMemoryLane(ctx, m) {
  const bounds = SCENES.slice(1).map((_, i) => SCENE_W * (i + 1));
  drawSegmentedBackground(ctx, SCENES.map(s => s.bg), bounds, 0.4, 380);

  // soft scene mood tint + gentle vignette
  ctx.fillStyle = SCENES[m.scene].tint;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,2,12,.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // ground strip
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  g.addColorStop(0, '#5a4a52'); g.addColorStop(1, '#2a2028');
  ctx.fillStyle = g; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // memory sparks behind the couple
  for (const p of m.sparks) {
    ctx.globalAlpha = Math.min(1, p.t) * .8;
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - camera.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  // the family
  if (!m.resting) {
    drawWalker(ctx, m.partner, m.t);
    drawWalker(ctx, m.lead, m.t);
    drawDoggo(ctx, m.dog, false, m.t);
  } else {
    // sitting by the water: both crouch close, Tonito dozing between them
    const settle = Math.min(1, m.restT / 1.2);
    drawSprite(ctx, `${m.partner.who}_crouch`, m.partner.x, GROUND_Y + 2,
               56, 1, settle);
    drawSprite(ctx, `${m.lead.who}_crouch`, m.lead.x, GROUND_Y + 2,
               56, -1, settle);
    drawDoggo(ctx, m.dog, true, m.t);
    // tired little "zZ" over Tonito once he's asleep
    if (m.restT > 2.2) {
      ctx.globalAlpha = .5 + Math.sin(m.t * 2) * .3;
      ctx.fillStyle = '#dfe8ff'; ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('z', m.dog.x - camera.x + 16, GROUND_Y - 40 - (m.t * 12 % 18));
      ctx.fillText('Z', m.dog.x - camera.x + 24, GROUND_Y - 52 - (m.t * 9 % 14));
      ctx.globalAlpha = 1;
    }
  }

  // caption for the current memory
  const sc = SCENES[m.scene];
  const a = clamp(m.captionT * 1.2, 0, 1) *
            (m.resting ? 1 : clamp(3.5 - (m.captionT - 4), 0, 1));
  if (a > 0) {
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(W / 2 - 360, 46, 720, 74);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText(sc.title, W / 2, 78);
    ctx.fillStyle = '#dfd7ff'; ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText(sc.sub, W / 2, 104);
    ctx.globalAlpha = 1;
  }

  // heart trail progress marker
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b88ae0'; ctx.font = '13px monospace';
  const frac = Math.round(clamp(m.lead.x / LENGTH, 0, 1) * 100);
  ctx.fillText(`♥ MEMORY LANE — ${frac}%`, W / 2, H - 14);

  if (m.resting && m.restT > 2) {
    ctx.globalAlpha = clamp(m.restT - 2, 0, 1);
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('AND THIS IS ONLY THE BEGINNING…', W / 2, H / 2 - 80);
    ctx.fillStyle = '#8a86b8'; ctx.font = '14px monospace';
    ctx.fillText('ENTER — back to the map', W / 2, H / 2 - 52);
    ctx.globalAlpha = 1;
  } else if (m.lead.x < 200) {
    ctx.fillStyle = '#8a86b8'; ctx.font = '13px monospace';
    ctx.fillText('walk with her  →   (A / D)', W / 2, H - 34);
  }
}

function drawWalker(ctx, e, t) {
  const pose = e.moving ? `run${Math.floor(e.animT * 8) % 2 + 1}` : 'idle';
  const bob = e.moving ? 0 : Math.sin(t * 2.4) * 1.5;
  drawSprite(ctx, `${e.who}_${pose}`, e.x, GROUND_Y + 2 + bob, 86, e.facing);
}

function drawDoggo(ctx, d, asleep, t) {
  let name;
  if (asleep) name = 'dog_sit_0';
  else if (d.moving) name = Math.floor(d.animT * 10) % 2 ? 'dog_run_0' : 'dog_run_1';
  else name = Math.floor(t * 2) % 2 ? 'dog_idle_0' : 'dog_idle_1';
  // tired Tonito breathes slowly when he finally lies down
  const h = asleep ? 30 + Math.sin(t * 1.6) * .8 : 34;
  drawSprite(ctx, name, d.x, GROUND_Y + 2, h, d.facing);
}
