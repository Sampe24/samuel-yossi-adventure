// Dance battle minigame: DDR-style rhythm duel synced to the chiptune
// sequencer. P1 hits W/A/S/D, P2 hits the arrow keys (an AI dances for P2
// until a human presses an arrow key). Same chart for both sides — highest
// score when the song ends wins.

import { W, H, pressed, drawSprite, camera, clamp } from './engine.js';
import { playSong, stopMusic, songClock, sfx } from './audio.js';

const LANES = ['up', 'left', 'down', 'right'];            // pose names
const P1_KEYS = { w: 0, a: 1, s: 2, d: 3 };
const P2_KEYS = { arrowup: 0, arrowleft: 1, arrowdown: 2, arrowright: 3 };
const LANE_CHAR = [['W', 'A', 'S', 'D'], ['↑', '←', '↓', '→']];
const LANE_COLOR = ['#ffd24a', '#7fd8ff', '#8fe98f', '#ff8fb0'];

const PERFECT_WIN = .06, GOOD_WIN = .14;                   // hit windows (s)
const SCROLL = 240;                                        // px per second
const HIT_Y = 396;                                         // judgement line
const LOOPS = 4;                                           // 64-step song x4
const INTRO_STEPS = 16;                                    // count-in

// Build the chart once from the dance track's drum line: every kick and
// snare becomes a note; the lane weaves pseudo-randomly but is identical
// for both players.
function buildChart() {
  const drums = ['k',null,'h','h','s',null,'h',null,'k',null,'k','h','s',null,'h','h',
                 'k',null,'h','h','s',null,'h',null,'k',null,'k','h','s',null,'s','s',
                 'k',null,'h','h','s',null,'h',null,'k',null,'k','h','s',null,'h','h',
                 'k',null,'h','h','s',null,'h',null,'k','k','s',null,'s','s','s',null];
  const chart = [];
  for (let loop = 0; loop < LOOPS; loop++) {
    for (let i = 0; i < drums.length; i++) {
      const d = drums[i];
      if (d !== 'k' && d !== 's') continue;
      if (loop === 0 && i < 8) continue;                  // ease in
      // late loops also take some hats for density
      const step = loop * drums.length + i;
      chart.push({ step, lane: (step * 7 + ((step / 16) | 0) * 3) % 4 });
      if (loop >= 2 && d === 's' && i % 16 === 12)        // extra spice
        chart.push({ step: step + 1, lane: (step * 5 + 2) % 4 });
    }
  }
  return chart;
}

function makeSide(who, keysMap) {
  return {
    who, keysMap, ai: keysMap === null,
    score: 0, combo: 0, bestCombo: 0,
    hits: { perfect: 0, good: 0, miss: 0 },
    notes: buildChart().map(n => ({ ...n, hit: false, judged: false })),
    pose: 'idle', poseT: 0, judge: null, judgeT: 0, flashT: 0,
  };
}

export function makeDance(game) {
  playSong('dance');
  const clock = songClock();
  const startStep = clock ? clock.step + INTRO_STEPS : INTRO_STEPS;
  const otherWho = game.myWho === 'samuel' ? 'yossi' : 'samuel';
  return {
    p1: makeSide(game.myWho, P1_KEYS),
    p2: makeSide(otherWho, null),                          // AI until joined
    startStep, done: false, doneT: 0, t: 0,
    lastStep: -1,
  };
}

function noteTime(d, note) {
  const clock = songClock();
  if (!clock) return Infinity;
  return clock.timeOfStep(d.startStep + note.step);
}

function judgeHit(side, lane, now, d) {
  let best = null, bestErr = Infinity;
  for (const n of side.notes) {
    if (n.judged || n.lane !== lane) continue;
    const err = Math.abs(noteTime(d, n) - now);
    if (err < bestErr) { bestErr = err; best = n; }
  }
  if (best && bestErr <= GOOD_WIN) {
    best.judged = true; best.hit = true;
    side.combo++; side.bestCombo = Math.max(side.bestCombo, side.combo);
    const perfect = bestErr <= PERFECT_WIN;
    side.score += (perfect ? 100 : 50) + Math.min(50, side.combo) * 2;
    side.hits[perfect ? 'perfect' : 'good']++;
    side.judge = perfect ? 'PERFECT!' : 'GOOD'; side.judgeT = .5;
    side.flashT = .18;
    side.pose = side.combo > 0 && side.combo % 16 === 0 ? 'spin' : LANES[lane];
    side.poseT = .35;
    (perfect ? sfx.dPerfect : sfx.dGood)();
  } else {
    side.combo = 0;
    side.judge = 'MISS'; side.judgeT = .5;
    side.pose = 'miss'; side.poseT = .4;
    sfx.dMiss();
  }
}

function aiUpdate(side, now, d) {
  for (const n of side.notes) {
    if (n.judged) continue;
    const t = noteTime(d, n);
    if (t - now > 0) break;                               // notes are ordered
    if (now - t < GOOD_WIN) {
      const roll = Math.random();
      if (roll < .78) {                                    // AI "presses"
        n.judged = true; n.hit = true;
        side.combo++; side.bestCombo = Math.max(side.bestCombo, side.combo);
        const perfect = roll < .55;
        side.score += (perfect ? 100 : 50) + Math.min(50, side.combo) * 2;
        side.hits[perfect ? 'perfect' : 'good']++;
        side.judge = perfect ? 'PERFECT!' : 'GOOD'; side.judgeT = .5;
        side.flashT = .18;
        side.pose = LANES[n.lane]; side.poseT = .35;
      }
      // else: leave it to expire into a miss below
    }
  }
}

export function updateDance(d, dt) {
  d.t += dt;
  const clock = songClock();
  if (!clock) return;
  const now = clock.now;

  // human joins P2 by touching the arrows
  if (d.p2.ai && Object.keys(P2_KEYS).some(k => pressed[k])) d.p2.ai = false;

  for (const [side, keysMap] of [[d.p1, P1_KEYS], [d.p2, d.p2.ai ? null : P2_KEYS]]) {
    if (keysMap) {
      for (const [k, lane] of Object.entries(keysMap))
        if (pressed[k]) judgeHit(side, lane, now, d);
    } else {
      aiUpdate(side, now, d);
    }
    // expire unjudged notes into misses
    for (const n of side.notes) {
      if (n.judged) continue;
      if (now - noteTime(d, n) > GOOD_WIN) {
        n.judged = true;
        side.combo = 0; side.hits.miss++;
        side.judge = 'MISS'; side.judgeT = .5;
        side.pose = 'miss'; side.poseT = .4;
      }
    }
    side.poseT -= dt; if (side.poseT <= 0) side.pose = 'idle';
    side.judgeT = Math.max(0, side.judgeT - dt);
    side.flashT = Math.max(0, side.flashT - dt);
  }

  if (!d.done && d.p1.notes.every(n => n.judged) && d.p2.notes.every(n => n.judged)) {
    d.done = true; d.doneT = 0;
    stopMusic(); sfx.victory();
  }
  if (d.done) d.doneT += dt;
}

// ---------------- drawing ----------------
export function drawDance(ctx, d) {
  camera.x = 0;
  // club backdrop: dark room, neon strips, moving spotlights, disco floor
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#160a24'); g.addColorStop(1, '#2a1040');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) {                            // spotlights
    const a = d.t * (0.4 + i * .17) + i * 2.1;
    const cx = W / 2 + Math.sin(a) * 330;
    const sg = ctx.createLinearGradient(W / 2, 0, cx, H);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(1, ['rgba(255,80,180,.14)', 'rgba(80,200,255,.14)',
                        'rgba(255,220,80,.12)'][i]);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(W / 2, -10); ctx.lineTo(cx - 90, H); ctx.lineTo(cx + 90, H);
    ctx.fill();
  }
  ctx.fillStyle = '#e050c0';                               // neon strips
  ctx.fillRect(0, 60, W, 3);
  ctx.fillStyle = '#40c8e0';
  ctx.fillRect(0, 66, W, 2);
  // disco floor
  for (let x = 0; x < W; x += 60) {
    for (let y = 430; y < H; y += 40) {
      const on = ((x / 60 + y / 40 + Math.floor(d.t * 2)) % 3) < 1;
      ctx.fillStyle = on ? 'rgba(255,120,220,.25)' : 'rgba(60,80,200,.18)';
      ctx.fillRect(x + 2, y + 2, 56, 36);
    }
  }
  // mirror ball
  ctx.fillStyle = '#c8d8e8';
  ctx.beginPath(); ctx.arc(W / 2, 90, 22, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 8; i++)
    ctx.fillRect(W / 2 - 20 + (i * 13 + d.t * 40) % 40, 74 + (i * 9) % 32, 4, 4);
  ctx.fillStyle = '#888'; ctx.fillRect(W / 2 - 1, 60, 2, 12);

  drawBoard(ctx, d, d.p1, 70, 0);
  drawBoard(ctx, d, d.p2, W - 70 - 4 * 44, 1);

  // dancers mid-stage
  drawDancer(ctx, d.p1, 350, d.t);
  drawDancer(ctx, d.p2, 610, d.t);

  // center title + count-in
  const clock = songClock();
  if (clock && !d.done) {
    const stepsIn = clock.step - (d.startStep - INTRO_STEPS);
    if (stepsIn < INTRO_STEPS) {
      const beat = Math.max(1, 4 - Math.floor(stepsIn / 4));
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 64px Georgia, serif';
      ctx.fillText(`${beat}`, W / 2, H / 2 - 40);
    }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e050c0'; ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('♪ DANCE BATTLE ♪', W / 2, 34);
  if (d.p2.ai) {
    ctx.fillStyle = '#8a86b8'; ctx.font = '12px monospace';
    ctx.fillText('P2 is dancing on auto — press any ARROW key to take over!',
                 W / 2, 52);
  }

  if (d.done) drawResults(ctx, d);
}

function drawBoard(ctx, d, side, x0, style) {
  const clock = songClock();
  const laneW = 44;
  ctx.fillStyle = 'rgba(10,6,22,.66)';
  ctx.fillRect(x0 - 8, 70, laneW * 4 + 16, 380);
  // hit line
  ctx.fillStyle = side.flashT > 0 ? '#fff' : 'rgba(255,255,255,.5)';
  ctx.fillRect(x0 - 4, HIT_Y - 2, laneW * 4 + 8, 4);
  for (let l = 0; l < 4; l++) {
    const lx = x0 + l * laneW + laneW / 2;
    // receptor
    ctx.strokeStyle = LANE_COLOR[l]; ctx.lineWidth = 2;
    ctx.globalAlpha = .8;
    ctx.strokeRect(lx - 16, HIT_Y - 16, 32, 32);
    ctx.globalAlpha = 1;
    ctx.fillStyle = LANE_COLOR[l]; ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(LANE_CHAR[style][l], lx, HIT_Y + 6);
    // notes
    if (!clock) continue;
    for (const n of side.notes) {
      if (n.judged) continue;
      const y = HIT_Y - (noteTime(d, n) - clock.now) * SCROLL;
      if (y < 60 || n.lane !== l) continue;
      if (y > HIT_Y + 30) continue;
      ctx.fillStyle = LANE_COLOR[l];
      ctx.beginPath();
      ctx.arc(lx, y, 13, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#1a1028'; ctx.font = 'bold 13px monospace';
      ctx.fillText(LANE_CHAR[style][n.lane], lx, y + 5);
    }
  }
  // score + combo + judgement
  ctx.textAlign = 'center';
  const cx = x0 + laneW * 2;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
  ctx.fillText(`${side.score}`, cx, 96);
  if (side.combo >= 4) {
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 14px monospace';
    ctx.fillText(`${side.combo} COMBO`, cx, 116);
  }
  if (side.judgeT > 0) {
    ctx.globalAlpha = Math.min(1, side.judgeT * 3);
    ctx.fillStyle = side.judge === 'PERFECT!' ? '#ffd24a'
                  : side.judge === 'GOOD' ? '#8fe98f' : '#ff7d7d';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(side.judge, cx, HIT_Y + 46);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#8a86b8'; ctx.font = 'bold 12px monospace';
  ctx.fillText(side.ai ? 'P2 · AUTO' : style === 0 ? 'P1' : 'P2', cx, 448);
}

function drawDancer(ctx, side, x, t) {
  const bob = side.pose === 'idle' ? Math.sin(t * 4.6) * 4 : 0;
  drawSprite(ctx, `${side.who}_dance_${side.pose}`, x, 430 + bob, 150,
             x < W / 2 ? 1 : -1);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dfd7ff'; ctx.font = 'bold 13px monospace';
  ctx.fillText(side.who.toUpperCase(), x, 452);
}

function drawResults(ctx, d) {
  const a = clamp(d.doneT, 0, 1);
  ctx.fillStyle = `rgba(8,4,20,${a * .78})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  const tie = d.p1.score === d.p2.score;
  const winner = d.p1.score >= d.p2.score ? d.p1 : d.p2;
  ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 42px Georgia, serif';
  ctx.fillText(tie ? "IT'S A TIE!" : `${winner.who.toUpperCase()} WINS!`,
               W / 2, 150);
  ctx.font = 'bold 16px monospace';
  for (const [side, x] of [[d.p1, W / 2 - 170], [d.p2, W / 2 + 170]]) {
    ctx.fillStyle = '#fff';
    ctx.fillText(`${side.who.toUpperCase()}${side.ai ? ' (AUTO)' : ''}`, x, 210);
    ctx.fillStyle = '#9ecbff';
    ctx.fillText(`SCORE   ${side.score}`, x, 244);
    ctx.fillStyle = '#ffd24a';
    ctx.fillText(`PERFECT ${side.hits.perfect}`, x, 270);
    ctx.fillStyle = '#8fe98f';
    ctx.fillText(`GOOD    ${side.hits.good}`, x, 292);
    ctx.fillStyle = '#ff7d7d';
    ctx.fillText(`MISS    ${side.hits.miss}`, x, 314);
    ctx.fillStyle = '#dfd7ff';
    ctx.fillText(`MAX COMBO ${side.bestCombo}`, x, 340);
  }
  // victory poses
  drawSprite(ctx, `${winner.who}_dance_win`, W / 2, 452, 140, 1);
  ctx.fillStyle = '#8a86b8'; ctx.font = '14px monospace';
  ctx.fillText('ENTER — back to the map      R — rematch', W / 2, H - 18);
  ctx.globalAlpha = 1;
}
