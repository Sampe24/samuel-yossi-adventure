// Samuel & Yossi: A 2D Adventure — main game loop and state machine.

import { W, H, GROUND_Y, loadImages, images, camera, updateCamera, clearPressed,
         pressed, keys, input, overlap, drawSprite, drawBackground, drawGround,
         drawPlatforms, drawLadders, clamp } from './engine.js';
import { makePlayer, updatePlayer, updateCompanion, hurtPlayer, drawPlayer,
         playerSprite, doSlash, doShoot, doNade, doChargedShot, MAX_HP,
         grantXP, xpForNext } from './player.js';
import { makeEnemy, updateEnemy, drawEnemy, makeBoss, updateBoss, drawBoss,
         drawBossBar, TYPES } from './enemies.js';
import { LEVELS } from './levels.js';
import { playSong, stopMusic, sfx, unlockAudio } from './audio.js';
import { net, hostGame, joinGame, send, playerPacket, worldPacket, closeNet } from './net.js';
import { makeEnding, updateEnding, drawEnding } from './ending.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const ASSET_LIST = [
  ...['samuel', 'yossi'].flatMap(w =>
    ['idle', 'run1', 'run2', 'jump', 'slash', 'shoot', 'throw',
     'slash2', 'slash3', 'crouch', 'roll', 'flip', 'climb', 'victory']
      .map(p => `${w}_${p}`)),
  ...Object.keys(TYPES), 'boss_alhambra', 'boss_cusco',
  'bg_granada', 'bg_alhambra', 'bg_cusco', 'bg_sweden', 'bg_sunset',
  'tile_granada', 'tile_cusco', 'tile_sweden',
];

// if a fancy pose is missing, fall back to a basic one (never pink boxes)
const SPRITE_FALLBACKS = {
  slash2: 'slash', slash3: 'slash', crouch: 'idle', roll: 'jump',
  flip: 'jump', climb: 'idle', victory: 'idle', spin: 'slash3',
};
function applyFallbacks() {
  for (const w of ['samuel', 'yossi'])
    for (const [pose, fb] of Object.entries(SPRITE_FALLBACKS))
      if (!images[`${w}_${pose}`]) images[`${w}_${pose}`] = images[`${w}_${fb}`];
}

// ---------------- game state ----------------
const game = {
  phase: 'title',        // title|play|bossintro|boss|clear|gameover|ending
  levelIdx: 0, level: LEVELS[0],
  me: null, other: null, players: [],
  enemies: [], bullets: [], nades: [], meleeHits: [], pickups: [], particles: [],
  boss: null, arena: false, arenaMax: 0,
  bannerT: 0, clearT: 0, isHost: true, myWho: 'samuel',
  paused: false, netTick: 0, ending: null,
  freeze: 0,                    // hit-stop timer
  popups: [],                   // floating combat/reward text
  lives: 3, checkpointHit: false, displayScore: 0,
  skillBanner: null,            // {text, t} — level-up skill unlock banner
};

function addPopup(x, y, text, color = '#ffe9a8', big = false) {
  game.popups.push({ x, y, text, color, big, t: 1.1, vy: -55 });
}
game.addPopup = addPopup;      // so player.js can announce level-ups
window.game = game;      // for debugging

// ---------------- menu wiring ----------------
const menu = document.getElementById('menu');
const roomInfo = document.getElementById('roomInfo');
net.onStatus = s => { roomInfo.textContent = s; };

for (const [id, who] of [['pickSamuel', 'samuel'], ['pickYossi', 'yossi']]) {
  document.getElementById(id).onclick = () => {
    game.myWho = who;
    document.getElementById('pickSamuel').classList.toggle('sel', who === 'samuel');
    document.getElementById('pickYossi').classList.toggle('sel', who === 'yossi');
  };
}

document.getElementById('btnSolo').onclick = () => {
  unlockAudio(); closeNet(); game.isHost = true;
  startLevel(0, true);
};
document.getElementById('btnHost').onclick = () => {
  unlockAudio(); closeNet(); game.isHost = true;
  roomInfo.textContent = 'Creating room...';
  hostGame(code => { roomInfo.textContent = `CODE: ${code} — waiting for partner...`; });
  const wait = setInterval(() => {
    if (net.connected) {
      clearInterval(wait);
      send({ t: 'start', hostWho: game.myWho });
      startLevel(0, false);
    }
  }, 250);
};
document.getElementById('btnJoin').onclick = () => {
  unlockAudio(); closeNet(); game.isHost = false;
  const code = document.getElementById('joinCode').value.trim();
  if (code.length !== 5) { roomInfo.textContent = 'Enter the 5-letter code'; return; }
  roomInfo.textContent = 'Connecting...';
  joinGame(code, err => { roomInfo.textContent = err; });
  const wait = setInterval(() => {
    if (net.startInfo) {
      clearInterval(wait);
      game.myWho = net.startInfo.hostWho === 'samuel' ? 'yossi' : 'samuel';
      startLevel(0, false);
    }
  }, 250);
};

function showMenu(show) { menu.style.display = show ? 'block' : 'none'; }
showMenu(true);

// ---------------- level setup ----------------
function startLevel(idx, solo) {
  if (game.phase === 'title' || game.phase === 'gameover') game.lives = 3;
  game.levelIdx = idx;
  game.level = LEVELS[idx];
  game.phase = 'play';
  game.arena = false; game.boss = null;
  game.enemies = []; game.bullets = []; game.nades = [];
  game.meleeHits = []; game.particles = []; game.popups = [];
  game.checkpointHit = false; game.freeze = 0; game.skillBanner = null;
  camera.x = 0;

  const keep = game.me ? { score: game.me.score, xp: game.me.xp, level: game.me.level } : null;
  game.me = makePlayer(game.myWho, 100);
  if (keep) Object.assign(game.me, keep);

  const otherWho = game.myWho === 'samuel' ? 'yossi' : 'samuel';
  if (net.role === 'solo') {
    game.other = makePlayer(otherWho, 40);
    game.other.companion = true;
  } else {
    game.other = makePlayer(otherWho, 60);
    game.other.remote = true;
  }
  game.players = [game.me, game.other];

  if (game.isHost) {
    game.enemies = game.level.spawns.map(s => makeEnemy(s.type, s.x));
  }
  game.pickups = game.level.pickups.map(k => ({
    type: k.type, x: k.x, y: k.py ? k.py - 26 : GROUND_Y - 30, w: 26, h: 26, got: false,
  }));

  game.bannerT = 3;
  showMenu(false);
  playSong(game.level.music);
}

function enterBossArena() {
  const bossCfg = game.level.boss;
  game.phase = 'bossintro';
  game.bannerT = 2.5;
  game.arena = true; game.arenaMax = W - 60;
  // swap to arena scene
  game.level = { ...game.level, bg: bossCfg.bg, length: W,
    pits: [], ladders: [], platforms: [
    { x: 120, y: 360, w: 150, h: 20 }, { x: W - 270, y: 360, w: 150, h: 20 }] };
  camera.x = 0;
  for (const p of game.players) { p.x = clamp(p.x, 60, 160); }
  game.me.x = 90; if (net.role === 'solo') game.other.x = 40;
  game.enemies = [];
  game.bullets = []; game.nades = [];
  if (game.isHost) game.boss = makeBoss(bossCfg.type, W - 320);
  playSong(bossCfg.music);
  sfx.bossRoar();
}

function levelCleared() {
  game.phase = 'clear';
  game.clearT = 3.4;
  sfx.victory();
  stopMusic();
}

window.debugEnding = () => startEnding();
window.debugPress = k => { pressed[k] = true; };
function startEnding() {
  game.phase = 'ending';
  game.ending = makeEnding(game);
  playSong('ending');
}

function gameOver() {
  game.phase = 'gameover';
  stopMusic();
}

// ---------------- combat ----------------
function explode(x, y) {
  sfx.boom(); camera.shake = 10;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 260;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80,
      t: .5 + Math.random() * .4, c: ['#ffd24a', '#ff8830', '#e33'][i % 3], r: 3 + Math.random() * 4 });
  }
  if (!game.isHost) return;
  const hit = t => Math.hypot(t.x + t.w / 2 - x, t.y + t.h / 2 - y) < 120;
  for (const e of game.enemies) if (hit(e)) damageEnemy(e, 4);
  if (game.boss && hit(game.boss)) damageBoss(4);
}

function damageEnemy(e, dmg, melee = false) {
  e.hp -= dmg; e.hitFlash = .15;
  if (melee) game.freeze = Math.max(game.freeze, dmg >= 6 ? .11 : .05);  // hit-stop
  addPopup(e.x + e.w / 2, e.y - 8, `${dmg}`, dmg >= 6 ? '#ff8830' : '#fff');
  if (dmg >= 6) addPopup(e.x + e.w / 2, e.y - 34, 'FINISHER!', '#ffd24a', true);
  if (e.hp <= 0) {
    sfx.enemyDie();
    game.me.score += e.score;
    grantXP(game.me, e.score, game);
    addPopup(e.x + e.w / 2, e.y - 22, `+${e.score}`, '#8fe98f', true);
    spark(e.x + e.w / 2, e.y + e.h / 2, '#fff');
    if (Math.random() < .28) {
      const type = ['ammo', 'ammo', 'nade', 'heart'][Math.floor(Math.random() * 4)];
      game.pickups.push({ type, x: e.x, y: GROUND_Y - 30, w: 26, h: 26, got: false });
    }
  }
}

function damageBoss(dmg) {
  const b = game.boss;
  if (!b || b.state === 'enter') return;
  b.hp -= dmg; b.hitFlash = .15;
  if (b.hp <= 0) {
    sfx.enemyDie(); sfx.boom();
    game.me.score += 2000;
    grantXP(game.me, 2000, game);
    for (let i = 0; i < 5; i++)
      setTimeout(() => explode(b.x + b.w / 2 + (Math.random() - .5) * 120,
                               b.y + Math.random() * b.h), i * 180);
    game.boss = null;
    levelCleared();
  }
}

function spark(x, y, c) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 160;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                          t: .3 + Math.random() * .3, c, r: 2 + Math.random() * 3 });
  }
}

function updateCombat(dt) {
  // bullets
  for (const b of game.bullets) {
    if (b.grav) b.vy += 900 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.wave && b.y + b.h < GROUND_Y) b.y = GROUND_Y - b.h;
  }
  game.bullets = game.bullets.filter(b => b.life > 0);

  // grenades
  for (const n of game.nades) {
    n.vy += 1500 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.t -= dt;
    if (n.y + n.h >= GROUND_Y) { n.y = GROUND_Y - n.h; n.vy *= -.35; n.vx *= .7; }
    if (n.t <= 0) { n.boom = true; explode(n.x, n.y); }
  }
  game.nades = game.nades.filter(n => !n.boom);

  // melee
  for (const m of game.meleeHits) {
    m.t -= dt;
    if (game.isHost) {
      for (const e of game.enemies) if (e.hp > 0 && !m.hitIds?.includes(e.id) && overlap(m, e)) {
        (m.hitIds = m.hitIds || []).push(e.id); damageEnemy(e, m.dmg, true);
      }
      if (game.boss && !m.hitBoss && overlap(m, game.boss)) {
        m.hitBoss = true;
        game.freeze = Math.max(game.freeze, m.dmg >= 6 ? .11 : .05);
        damageBoss(m.dmg);
      }
    }
  }
  game.meleeHits = game.meleeHits.filter(m => m.t > 0);

  if (game.isHost) {
    // player bullets vs enemies / boss; enemy bullets vs players
    for (const b of game.bullets) {
      if (b.from === 'player') {
        for (const e of game.enemies) {
          if (e.hp <= 0 || !overlap(b, e)) continue;
          if (b.pierce) {          // charged shot: passes through, hits each once
            if (!b.hitIds.includes(e.id)) {
              b.hitIds.push(e.id); damageEnemy(e, b.dmg); spark(b.x, b.y, '#7fd8ff');
            }
          } else { damageEnemy(e, b.dmg); b.life = 0; spark(b.x, b.y, '#ffd24a'); break; }
        }
        if (b.life > 0 && game.boss && overlap(b, game.boss)) {
          if (b.pierce) {
            if (!b.hitBossP) { b.hitBossP = true; damageBoss(b.dmg); spark(b.x, b.y, '#7fd8ff'); }
          } else { damageBoss(b.dmg); b.life = 0; spark(b.x, b.y, '#ffd24a'); }
        }
      } else {
        for (const p of game.players) {
          if (p.dead || !overlap(b, p)) continue;
          if (p.guarding) {
            if (p.level >= 4 && p.guardT < .18) {        // PARRY: reflect the shot
              b.from = 'player'; b.dmg = 2; b.color = '#7fd8ff';
              b.vx = Math.max(420, Math.abs(b.vx)) * p.facing; b.vy = 0;
              b.grav = false; b.wave = false; b.life = 1.4;
              sfx.parry(); game.freeze = Math.max(game.freeze, .06);
              addPopup(p.x + p.w / 2, p.y - 26, 'PARRY!', '#7fd8ff', true);
            } else {                                      // blocked
              b.life = 0; sfx.guard(); spark(b.x, b.y, '#ffd76a');
            }
          } else if (p.inv <= 0) { hurtPlayer(p, b.dmg, game); b.life = 0; }
          break;
        }
      }
    }
    // contact damage
    for (const e of game.enemies) {
      if (e.hp <= 0) continue;
      for (const p of game.players)
        if (!p.dead && overlap(e, p)) hurtPlayer(p, e.dmg, game);
    }
    if (game.boss && game.boss.state !== 'enter')
      for (const p of game.players)
        if (!p.dead && overlap(game.boss, p)) hurtPlayer(p, 2, game);
    // dead or pit-fallen enemies removed
    game.enemies = game.enemies.filter(e => {
      if (e.y > H + 200) {
        game.me.score += Math.floor(e.score / 2);
        grantXP(game.me, Math.floor(e.score / 2), game);
        return false;
      }
      return e.hp > 0;
    });
    // pickups
    for (const k of game.pickups) {
      if (k.got) continue;
      for (const p of game.players) {
        if (p.dead || !overlap(k, p)) continue;
        k.got = true; sfx.pickup();
        if (k.type === 'ammo') { p.ammo = Math.min(99, p.ammo + 12); addPopup(k.x + 13, k.y - 8, '+12 AMMO'); }
        if (k.type === 'nade') { p.nades = Math.min(9, p.nades + 2); addPopup(k.x + 13, k.y - 8, '+2 NADES', '#9be07d'); }
        if (k.type === 'heart') { p.hp = Math.min(MAX_HP, p.hp + 2); addPopup(k.x + 13, k.y - 8, '+1 ♥', '#ff7d7d'); }
        break;
      }
    }
  }

  // particles
  for (const pt of game.particles) {
    pt.vy += 700 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.t -= dt;
  }
  game.particles = game.particles.filter(p => p.t > 0);
}

// ---------------- net sync ----------------
function netUpdate(dt) {
  if (net.role === 'solo') return;
  game.netTick++;

  // send own player state (30 Hz)
  if (game.netTick % 2 === 0) {
    send(playerPacket(game.me, game.myEvents));
    game.myEvents = [];
  }

  // apply remote player state
  const r = net.remoteState;
  if (r) {
    const o = game.other;
    o.x += (r.x - o.x) * Math.min(1, dt * 14);
    o.y += (r.y - o.y) * Math.min(1, dt * 14);
    o.facing = r.f; o.action = r.a; o.dead = r.dead; o.vx = r.vx; o.onGround = r.og;
    o.guarding = !!r.gd; o.guardT = r.gt ?? 9; o.level = r.lv || o.level;
    if (game.isHost) o.hpReported = r.hp;
    o.animTimer += dt;
  }

  if (game.isHost) {
    // apply guest action events
    for (const ev of net.guestEvents) {
      const o = game.other;
      o.x = ev.x; o.y = ev.y; o.facing = ev.f;
      if (ev.e === 'slash') doSlash(o, game);
      if (ev.e === 'shoot') { o.ammo = 99; doShoot(o, game); }
      if (ev.e === 'cshot') { o.ammo = 99; o.chargeT = ev.ct || 1.1; doChargedShot(o, game); }
      if (ev.e === 'nade')  { o.nades = 9; doNade(o, game); }
    }
    net.guestEvents.length = 0;
    if (game.netTick % 4 === 0) send(worldPacket(game));
  } else {
    // guest: adopt world snapshot
    const wld = net.hostState;
    if (wld) {
      // enemies (render-only replicas)
      game.enemies = wld.en.map(e => {
        const t = TYPES[e.ty];
        return { id: e.id, type: e.ty, x: e.x, y: e.y, hp: e.hp, facing: e.f,
                 w: t.size * .5, h: t.size * .78, size: t.size, ai: t.ai,
                 hitFlash: 0, animT: performance.now() / 1000 };
      });
      game.boss = wld.bo ? { ...wld.bo, type: wld.bo.ty, x: wld.bo.x, y: wld.bo.y,
        hp: wld.bo.hp, facing: wld.bo.f, size: wld.bo.ty === 'boss_cusco' ? 320 : 300,
        w: 140, h: 250, maxHp: wld.bo.ty === 'boss_cusco' ? 90 : 70,
        name: wld.bo.ty === 'boss_cusco' ? 'STONE COLOSSUS OF CUSCO' : 'DJINN SULTAN OF THE ALHAMBRA',
        hitFlash: 0, animT: 0, state: wld.bo.st } : null;
      game.bullets = wld.bu.map(b => ({ ...b, h: b.w > 20 ? 18 : 6, vx: 0, vy: 0, life: 1,
                                        from: b.fr, dmg: 0 }));
      game.pickups = wld.pk.map(k => ({ ...k, type: k.ty, w: 26, h: 26 }));
      // own hp decided by host (unless we died locally, e.g. pit fall)
      if (!game.me.dead) {
        if (wld.ghp < game.me.hp) { sfx.hurt(); game.me.inv = 1.2; camera.shake = 6; }
        game.me.hp = wld.ghp;
        if (game.me.hp <= 0) game.me.dead = true;
      }
      // phase transitions driven by host
      if (wld.ph !== game.phase && ['bossintro', 'boss', 'clear', 'gameover', 'ending', 'play'].includes(wld.ph)) {
        syncPhase(wld.ph, wld.li);
      }
    }
  }
}

function syncPhase(ph, li) {
  if (ph === 'play' && li !== game.levelIdx) { startLevel(li, false); return; }
  if (ph === 'bossintro' && game.phase === 'play') { enterBossArena(); game.phase = 'bossintro'; return; }
  if (ph === 'boss') { if (!game.arena) enterBossArena(); game.phase = 'boss'; return; }
  if (ph === 'clear') { levelCleared(); return; }
  if (ph === 'ending') { startEnding(); return; }
  if (ph === 'gameover') { gameOver(); return; }
  game.phase = ph;
}

// wrap combat actions so guest reports events
game.myEvents = [];
const origSlash = doSlash, origShoot = doShoot, origNade = doNade;

// ---------------- main loop ----------------
let last = performance.now();
let assetsReady = false;

loadImages(ASSET_LIST).then(() => {
  applyFallbacks();
  assetsReady = true;
  const q = new URLSearchParams(location.search);
  if (q.has('test')) runSmokeTest();
  if (q.has('autohost')) runNetTest('host', q.get('autohost'));
  if (q.has('autojoin')) runNetTest('join', q.get('autojoin'));
});

// Two-instance network smoke test (host/guest over PeerJS).
function runNetTest(role, code) {
  const log = m => { document.getElementById('errlog').textContent +=
    `[${role}] ` + m + '\n'; };
  net.onStatus = s => log('status: ' + s);
  let ticks = 0;
  const report = setInterval(() => {
    ticks++;
    try { for (let i = 0; i < 30; i++) update(1 / 60); } catch (e) { log('ERR ' + e.message); }
    log(`t${ticks} conn=${net.connected} phase=${game.phase} ` +
        `me=${game.me ? Math.round(game.me.x) : '-'} other=${game.other ? Math.round(game.other.x) : '-'} ` +
        `enemies=${game.enemies.length}`);
    if (ticks >= 24) { log('NETTEST done'); clearInterval(report); }
  }, 1000);
  if (role === 'host') {
    game.isHost = true;
    hostGame(c => {
      log('hosting ' + c);
      const wait = setInterval(() => {
        if (net.connected) { clearInterval(wait);
          send({ t: 'start', hostWho: game.myWho });
          startLevel(0, false); keys['d'] = true; keys['k'] = true; }
      }, 200);
    }, code);
  } else {
    game.isHost = false;
    joinGame(code, err => log('joinfail ' + err));
    const wait = setInterval(() => {
      if (net.startInfo) { clearInterval(wait);
        game.myWho = net.startInfo.hostWho === 'samuel' ? 'yossi' : 'samuel';
        startLevel(0, false); keys['d'] = true; }
    }, 200);
  }
}

// Headless smoke test: auto-play solo, run right while shooting/slashing,
// report status into #errlog for --dump-dom inspection.
function runSmokeTest() {
  const log = m => { document.getElementById('errlog').textContent += m + '\n'; };
  log('TEST start');
  try { document.getElementById('btnSolo').click(); } catch (e) { log('ERR menu ' + e.message); }
  keys['d'] = true; keys['k'] = true;
  let ticks = 0;
  const iv = setInterval(() => {
    ticks++;
    pressed['j'] = true; pressed['w'] = ticks % 3 === 0; pressed['l'] = ticks % 5 === 0;
    pressed['k'] = ticks % 2 === 0;                    // tap-fire (charged shot at LV2+)
    keys['s'] = ticks % 7 === 3;                       // exercise roll/crouch too
    keys['h'] = ticks % 6 === 5;                       // exercise guard too
    if (ticks === 3 && game.me && game.me.level < 2)   // force an early level-up
      grantXP(game.me, 1200, game);
    if (game.phase === 'gameover') { pressed['enter'] = true; log('retrying after death'); }
    if (game.me) {
      game.me.inv = 2; game.me.ammo = 99; game.me.nades = 9;
      if (game.me.dead) {                        // revive after pit falls
        game.me.dead = false; game.me.hp = 8;
        game.me.y = 200; game.me.vy = 0; log('revived after fall');
      }
    }
    // simulate 1 second of game time regardless of rAF throttling
    try {
      for (let i = 0; i < 60; i++) update(1 / 60);
    } catch (e) { log('ERR update ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
    log(`t${ticks} phase=${game.phase} lvl=${game.levelIdx} x=${game.me ? Math.round(game.me.x) : '-'} ` +
        `enemies=${game.enemies.length} boss=${game.boss ? Math.ceil(game.boss.hp) : '-'} hp=${game.me ? game.me.hp : '-'}`);
    if (game.phase === 'play' && ticks % 5 === 4 && game.me) {
      game.me.x = game.level.length - 320;             // fast-forward to level end
      game.me.y = 200; game.me.vy = 0;
    }
    if (game.boss && game.boss.hp > 6) game.boss.hp = 6;  // shorten boss fights
    if (game.phase === 'ending') { pressed['enter'] = false; }
    if (ticks >= 45 || (game.ending && game.ending.t > 3)) {
      log('TEST done phase=' + game.phase); clearInterval(iv);
    }
  }, 400);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (!assetsReady) { drawLoading(); return; }

  if (pressed['p'] && ['play', 'boss'].includes(game.phase)) game.paused = !game.paused;

  if (!game.paused) update(dt);
  render();
  clearPressed();
}
requestAnimationFrame(frame);

// record guest events by intercepting key actions in updatePlayer:
// simplest: detect action changes after update
let prevAction = null, prevAmmo = 0, prevNades = 0;

function update(dt) {
  // hit-stop: freeze the world for a few frames on heavy hits
  if (game.freeze > 0 && ['play', 'boss'].includes(game.phase)) {
    game.freeze -= dt;
    return;
  }
  // floating popups always animate
  for (const pop of game.popups) { pop.y += pop.vy * dt; pop.t -= dt; }
  game.popups = game.popups.filter(p => p.t > 0);
  if (game.skillBanner && (game.skillBanner.t -= dt) <= 0) game.skillBanner = null;
  // eased score display
  game.displayScore += (Math.max(0, (game.me?.score ?? 0)) - game.displayScore) *
                       Math.min(1, dt * 6);

  switch (game.phase) {
    case 'title': break;

    case 'play': {
      game.bannerT -= dt;
      const before = { a: game.me.action, ammo: game.me.ammo, nades: game.me.nades,
                       sw: game.me.swordCd };
      updatePlayer(game.me, dt, game, true);
      recordEvents(before);

      if (net.role === 'solo') updateCompanion(game.other, dt, game);

      if (game.isHost) {
        for (const e of game.enemies)
          if (Math.abs(e.x - camera.x - W / 2) < 1400) updateEnemy(e, dt, game);
      }
      updateCombat(dt);
      netUpdate(dt);
      updateCamera(game.me, game.level.length, dt);

      // checkpoint flag
      if (!game.checkpointHit && game.level.checkpoint &&
          game.me.x > game.level.checkpoint) {
        game.checkpointHit = true;
        sfx.pickup();
        addPopup(game.me.x + 20, game.me.y - 30, 'CHECKPOINT!', '#8fe98f', true);
      }

      // reach end of level?
      if (game.isHost && game.me.x > game.level.length - 260) {
        if (game.level.boss) enterBossArena();
        else if (game.levelIdx === 2) startEnding();
        else levelCleared();
      }
      checkDead(dt);
      break;
    }

    case 'bossintro':
      game.bannerT -= dt;
      if (game.boss) updateBoss(game.boss, dt, game);
      if (game.bannerT <= 0 && (game.isHost || game.boss)) game.phase = 'boss';
      netUpdate(dt);
      break;

    case 'boss': {
      const before = { a: game.me.action, ammo: game.me.ammo, nades: game.me.nades,
                       sw: game.me.swordCd };
      updatePlayer(game.me, dt, game, true);
      recordEvents(before);
      if (net.role === 'solo') updateCompanion(game.other, dt, game);
      if (game.isHost && game.boss) updateBoss(game.boss, dt, game);
      updateCombat(dt);
      netUpdate(dt);
      camera.x = 0;
      checkDead(dt);
      break;
    }

    case 'clear':
      game.clearT -= dt;
      netUpdate(dt);
      if (game.clearT <= 0 && game.isHost) {
        if (game.levelIdx === 2) startEnding();
        else startLevel(game.levelIdx + 1, net.role === 'solo');
      }
      break;

    case 'gameover':
      netUpdate(dt);
      if (pressed['enter'] && game.isHost) startLevel(game.levelIdx, net.role === 'solo');
      break;

    case 'ending':
      updateEnding(game.ending, dt);
      netUpdate(dt);
      if (game.ending.done && pressed['enter']) {
        stopMusic(); closeNet();
        game.phase = 'title';
        game.me = null;
        showMenu(true);
        roomInfo.textContent = '';
      }
      break;
  }
}

function recordEvents(before) {
  if (net.role === 'solo' || game.isHost) return;
  const p = game.me;
  if (p.action === 'slash' && before.sw > 0 !== p.swordCd > 0 && p.swordCd > before.sw)
    game.myEvents.push({ e: 'slash', x: p.x, y: p.y, f: p.facing });
  if (p.ammo < before.ammo) {
    game.myEvents.push(p.lastShotCharged
      ? { e: 'cshot', ct: p.chargeT, x: p.x, y: p.y, f: p.facing }
      : { e: 'shoot', x: p.x, y: p.y, f: p.facing });
    p.lastShotCharged = false;
  }
  if (p.nades < before.nades)
    game.myEvents.push({ e: 'nade', x: p.x, y: p.y, f: p.facing });
  if (p.action === 'slash' && before.a !== 'slash')
    if (!game.myEvents.some(ev => ev.e === 'slash'))
      game.myEvents.push({ e: 'slash', x: p.x, y: p.y, f: p.facing });
}

function checkDead(dt) {
  const p = game.me;
  if (p.dead) {
    if (p.respawnT === null && game.lives > 0) {         // spend a life
      game.lives--;
      p.respawnT = 1.3;
      addPopup(p.x + p.w / 2, p.y - 20, game.lives > 0 ? `${game.lives} LIVES LEFT` : 'LAST CHANCE!',
               '#ff7d7d', true);
    } else if (p.respawnT !== null && (p.respawnT -= dt) <= 0) {
      p.respawnT = null;
      p.dead = false; p.hp = MAX_HP; p.inv = 2.5; p.vy = 0; p.climbing = false;
      p.x = game.arena ? 90
          : game.checkpointHit && game.level.checkpoint ? game.level.checkpoint - 60 : 80;
      p.y = 200;
      return;
    }
  }
  const meStuckDead = p.dead && game.lives <= 0 && p.respawnT === null;
  if (game.isHost && meStuckDead &&
      (net.role === 'solo' ? true : (game.other.dead || !net.connected))) gameOver();
  else if (!game.isHost && meStuckDead && game.other.dead) gameOver();
}

// ---------------- rendering ----------------
function drawLoading() {
  ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8c860'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
  ctx.fillText('LOADING ADVENTURE...', W / 2, H / 2);
}

function render() {
  ctx.clearRect(0, 0, W, H);

  if (game.phase === 'title') {
    drawBackground(ctx, 'bg_granada', 0);
    ctx.fillStyle = 'rgba(8,6,20,.45)'; ctx.fillRect(0, 0, W, H);
    return;
  }
  if (game.phase === 'ending') { drawEnding(ctx, game.ending); return; }

  drawBackground(ctx, game.level.bg, game.arena ? 0 : 0.35);
  drawGround(ctx, game.level);
  drawPlatforms(ctx, game.level);
  drawLadders(ctx, game.level);

  // checkpoint flag
  if (!game.arena && game.level.checkpoint) {
    const fx = game.level.checkpoint - camera.x;
    if (fx > -50 && fx < W + 50) {
      ctx.fillStyle = '#5a4630';
      ctx.fillRect(fx - 3, GROUND_Y - 96, 6, 96);
      const wave = Math.sin(performance.now() / 250) * 4;
      ctx.fillStyle = game.checkpointHit ? '#8fe98f' : '#c0392b';
      ctx.beginPath();
      ctx.moveTo(fx + 3, GROUND_Y - 94);
      ctx.lineTo(fx + 42 + wave, GROUND_Y - 82);
      ctx.lineTo(fx + 3, GROUND_Y - 68);
      ctx.fill();
    }
  }

  // pickups
  for (const k of game.pickups) {
    if (k.got) continue;
    const sx = k.x - camera.x + 13, sy = k.y + 13 + Math.sin(performance.now() / 300 + k.x) * 3;
    if (sx < -30 || sx > W + 30) continue;
    if (k.type === 'heart') {
      ctx.fillStyle = '#e3312f';
      ctx.beginPath();
      ctx.moveTo(sx, sy + 8);
      ctx.bezierCurveTo(sx - 12, sy - 4, sx - 6, sy - 12, sx, sy - 4);
      ctx.bezierCurveTo(sx + 6, sy - 12, sx + 12, sy - 4, sx, sy + 8);
      ctx.fill();
    } else if (k.type === 'ammo') {
      ctx.fillStyle = '#caa93c'; ctx.fillRect(sx - 10, sy - 8, 20, 14);
      ctx.fillStyle = '#7a6420'; ctx.fillRect(sx - 10, sy - 8, 20, 4);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('AMMO', sx, sy + 3);
    } else {
      ctx.fillStyle = '#4a7c2f'; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(sx - 2, sy - 13, 4, 6);
    }
  }

  // grenades in flight
  for (const n of game.nades) {
    ctx.fillStyle = '#3d6b28';
    ctx.beginPath(); ctx.arc(n.x - camera.x, n.y, 7, 0, 7); ctx.fill();
  }

  // bullets
  for (const b of game.bullets) {
    const sx = b.x - camera.x;
    if (b.fire || b.w >= 18) {
      ctx.fillStyle = b.color || '#ff8830';
      ctx.beginPath(); ctx.arc(sx, b.y, b.w / 2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,120,.6)';
      ctx.beginPath(); ctx.arc(sx, b.y, b.w / 4, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = b.color || (b.from === 'player' ? '#ffe9a8' : '#ffd24a');
      ctx.fillRect(sx - 6, b.y - 2, 12, 4);
    }
  }

  // entities
  for (const e of game.enemies) drawEnemy(ctx, e);
  if (game.boss) drawBoss(ctx, game.boss);
  drawPlayer(ctx, game.other);
  drawPlayer(ctx, game.me);

  // particles
  for (const p of game.particles) {
    ctx.globalAlpha = Math.min(1, p.t * 2);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - camera.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
  }
  ctx.globalAlpha = 1;

  // floating popups (damage numbers, rewards)
  for (const pop of game.popups) {
    ctx.globalAlpha = Math.min(1, pop.t * 1.6);
    ctx.font = pop.big ? 'bold 20px monospace' : 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(pop.text, pop.x - camera.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x - camera.x, pop.y);
  }
  ctx.globalAlpha = 1;

  drawHUD();

  // skill-unlock banner
  if (game.skillBanner && ['play', 'boss', 'bossintro'].includes(game.phase)) {
    ctx.globalAlpha = Math.min(1, game.skillBanner.t);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 320, 84, 640, 42);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7fd8ff'; ctx.font = 'bold 18px monospace';
    ctx.fillText(game.skillBanner.text, W / 2, 111);
    ctx.globalAlpha = 1;
  }

  if (game.boss && ['boss', 'bossintro'].includes(game.phase)) drawBossBar(ctx, game.boss);

  // banners
  if (game.bannerT > 0 && ['play', 'bossintro'].includes(game.phase)) {
    const a = Math.min(1, game.bannerT);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H / 2 - 58, W, 104);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(game.phase === 'bossintro' ? game.level.boss?.intro || LEVELS[game.levelIdx].boss.intro
                                            : LEVELS[game.levelIdx].name, W / 2, H / 2 - 10);
    if (game.phase === 'play') {
      ctx.fillStyle = '#dfd7ff'; ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText(LEVELS[game.levelIdx].subtitle, W / 2, H / 2 + 26);
    }
    ctx.globalAlpha = 1;
  }

  if (game.phase === 'clear') {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8fe98f'; ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('LEVEL CLEARED!', W / 2, H / 2 - 10);
    ctx.fillStyle = '#fff'; ctx.font = '20px monospace';
    ctx.fillText(`SCORE ${game.me.score}`, W / 2, H / 2 + 32);
  }

  if (game.phase === 'gameover') {
    ctx.fillStyle = 'rgba(20,0,0,.65)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e3312f'; ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 12);
    ctx.fillStyle = '#fff'; ctx.font = '18px monospace';
    ctx.fillText(game.isHost ? 'Press ENTER to retry the level' : 'Waiting for host to retry...',
                 W / 2, H / 2 + 30);
  }

  if (game.paused) {
    ctx.fillStyle = 'rgba(0,0,20,.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px monospace';
    ctx.fillText('PAUSED', W / 2, H / 2);
  }
}

function drawHUD() {
  const p = game.me;
  if (!p) return;
  ctx.save();
  // hearts — pulse when low on hp
  const low = p.hp <= 2 && !p.dead;
  const pulse = low ? 1 + Math.sin(performance.now() / 130) * .18 : 1;
  for (let i = 0; i < MAX_HP / 2; i++) {
    const hx = 26 + i * 30, hy = 26;
    const fill = p.hp >= (i + 1) * 2 ? 1 : p.hp === i * 2 + 1 ? .5 : 0;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(pulse, pulse);
    ctx.translate(-hx, -hy);
    drawHeart(hx, hy, '#3a1020');
    if (fill) {
      ctx.save();
      ctx.beginPath(); ctx.rect(hx - 14, hy - 14, 28 * fill, 30); ctx.clip();
      drawHeart(hx, hy, low ? '#ff5a45' : '#e3312f');
      ctx.restore();
    }
    ctx.restore();
  }
  // lives
  ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(`x${game.lives}`, 26 + (MAX_HP / 2) * 30 + 4, 32);
  // ammo / grenades / score / level + XP bar
  ctx.fillStyle = '#000a'; ctx.fillRect(16, 44, 190, 74);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(`AMMO ${p.ammo}`, 26, 64);
  ctx.fillText(`NADE ${p.nades}`, 26, 86);
  ctx.fillStyle = '#9ecbff';
  ctx.fillText(`SCORE ${Math.round(game.displayScore)}`, 116, 64);
  ctx.fillStyle = '#8a86b8';
  ctx.font = '12px monospace';
  ctx.fillText(net.role === 'solo' ? 'SOLO+AI' : net.connected ? 'ONLINE' : 'OFFLINE?', 116, 86);
  ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 14px monospace';
  ctx.fillText(`LV ${p.level}`, 26, 108);
  const xpPrev = p.level === 1 ? 0 : xpForNext(p.level - 1);
  const xpFrac = clamp((p.xp - xpPrev) / (xpForNext(p.level) - xpPrev), 0, 1);
  ctx.fillStyle = '#2a2350'; ctx.fillRect(76, 98, 120, 10);
  ctx.fillStyle = '#7fd8ff'; ctx.fillRect(76, 98, 120 * xpFrac, 10);
  ctx.strokeStyle = '#555'; ctx.strokeRect(76.5, 98.5, 120, 10);
  // level tag
  ctx.textAlign = 'right'; ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#ffd76a';
  ctx.fillText(LEVELS[game.levelIdx].name, W - 20, 30);
  ctx.restore();
}

function drawHeart(x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.bezierCurveTo(x - 16, y - 4, x - 8, y - 16, x, y - 5);
  ctx.bezierCurveTo(x + 8, y - 16, x + 16, y - 4, x, y + 12);
  ctx.fill();
}
