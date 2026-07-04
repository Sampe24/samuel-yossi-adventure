// Chiptune music sequencer + synthesized SFX (NES-style, Web Audio).

let ac = null, master = null, musicGain = null;
let current = null;   // { song, step, timer, nextTime }

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
export function unlockAudio() { ctx(); }

const NOTE = {};
{ // build note table  C2..B6
  const names = ['c','cs','d','ds','e','f','fs','g','gs','a','as','b'];
  for (let oct = 1; oct <= 7; oct++)
    names.forEach((n, i) => { NOTE[n + oct] = 440 * Math.pow(2, (oct * 12 + i - 57) / 12); });
}

function blip(type, freq, t, dur, vol, dest, slide = 0) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest || master);
  o.start(t); o.stop(t + dur + .02);
}

function noiseBurst(t, dur, vol, hp = 800, dest) {
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest || master);
  src.start(t);
}

/* ---------------- songs ----------------
 A song: { bpm, sub (steps per beat), lead:[], harm:[], bass:[], drums:[] }
 Tracks are arrays of equal length; each entry: note name, null (rest),
 or '-' (tie / let ring). Drums: 'k' kick, 's' snare, 'h' hat.        */

const S = {};

// GRANADA — Spanish/flamenco feel, E Phrygian dominant.
S.granada = { bpm: 152, sub: 2,
  lead: ['e4',null,'f4',null,'gs4',null,'a4',null,'b4',null,'a4',null,'gs4',null,'f4',null,
         'e4',null,'gs4',null,'b4',null,'c5',null,'b4','a4','gs4','f4','e4',null,null,null,
         'e5',null,'ds5',null,'c5',null,'b4',null,'a4',null,'gs4',null,'f4',null,'gs4',null,
         'a4','b4','c5','b4','a4','gs4','f4','e4','f4',null,'e4',null,null,null,null,null],
  harm: ['e3',null,null,null,'e3',null,null,null,'e3',null,null,null,'e3',null,null,null,
         'a3',null,null,null,'a3',null,null,null,'gs3',null,null,null,'e3',null,null,null,
         'c4',null,null,null,'b3',null,null,null,'a3',null,null,null,'gs3',null,null,null,
         'f3',null,null,null,'gs3',null,null,null,'e3',null,null,null,null,null,null,null],
  bass: ['e2',null,'e2',null,'e2',null,'b2',null,'e2',null,'e2',null,'b2',null,'e2',null,
         'a2',null,'a2',null,'e2',null,'e2',null,'gs2',null,'gs2',null,'e2',null,'e2',null,
         'c3',null,'c3',null,'b2',null,'b2',null,'a2',null,'a2',null,'gs2',null,'gs2',null,
         'f2',null,'f2',null,'gs2',null,'gs2',null,'e2',null,'e2',null,'e2',null,null,null],
  drums:['k',null,'h',null,'s',null,'h','h','k',null,'h',null,'s',null,'h',null,
         'k',null,'h',null,'s',null,'h','h','k',null,'h',null,'s',null,'h',null,
         'k',null,'h',null,'s',null,'h','h','k',null,'h',null,'s',null,'h',null,
         'k',null,'h',null,'s',null,'h','h','k','k','s',null,'s','s',null,null] };

// CUSCO — Andean pentatonic (A minor pent), airy triangle lead.
S.cusco = { bpm: 132, sub: 2,
  lead: ['a4',null,'c5',null,'d5',null,'e5',null,'d5',null,'c5',null,'a4',null,null,null,
         'g4',null,'a4',null,'c5',null,'d5',null,'c5',null,'a4',null,'g4',null,null,null,
         'e5',null,'g5',null,'e5',null,'d5',null,'c5',null,'d5',null,'e5',null,null,null,
         'd5','c5','a4',null,'g4','a4','c5',null,'a4',null,null,null,null,null,null,null],
  harm: ['e4',null,null,null,'e4',null,null,null,'e4',null,null,null,'e4',null,null,null,
         'd4',null,null,null,'d4',null,null,null,'e4',null,null,null,'d4',null,null,null,
         'g4',null,null,null,'g4',null,null,null,'a4',null,null,null,'g4',null,null,null,
         'e4',null,null,null,'d4',null,null,null,'e4',null,null,null,null,null,null,null],
  bass: ['a2',null,'a2',null,'e2',null,'e2',null,'a2',null,'a2',null,'e2',null,'a2',null,
         'g2',null,'g2',null,'d2',null,'d2',null,'a2',null,'a2',null,'g2',null,'g2',null,
         'c3',null,'c3',null,'g2',null,'g2',null,'a2',null,'a2',null,'c3',null,'c3',null,
         'd3',null,'d3',null,'g2',null,'g2',null,'a2',null,'a2',null,'a2',null,null,null],
  drums:['k',null,null,'h','k',null,'h',null,'k',null,null,'h','k',null,'h',null,
         'k',null,null,'h','k',null,'h',null,'k',null,null,'h','k',null,'h',null,
         'k',null,null,'h','k',null,'h',null,'k',null,null,'h','k',null,'h',null,
         'k',null,'s',null,'k',null,'s',null,'k',null,'s','s','k',null,null,null] };

// SWEDEN — folk waltz in G, 3/4.
S.sweden = { bpm: 160, sub: 2,
  lead: ['g4',null,'b4',null,'d5',null,'b4',null,'g4',null,'a4',null,'b4',null,'a4',null,'g4',null,
         'e4',null,'g4',null,'c5',null,'b4',null,'a4',null,'fs4',null,'g4',null,null,null,null,null,
         'g4',null,'b4',null,'d5',null,'e5',null,'d5',null,'b4',null,'c5',null,'a4',null,'fs4',null,
         'g4',null,'a4',null,'b4',null,'a4',null,'g4',null,'g4',null,'g4',null,null,null,null,null],
  harm: ['b3',null,null,'d4',null,null,'b3',null,null,'d4',null,null,'b3',null,null,'d4',null,null,
         'c4',null,null,'e4',null,null,'c4',null,null,'d4',null,null,'b3',null,null,'d4',null,null,
         'b3',null,null,'d4',null,null,'c4',null,null,'e4',null,null,'c4',null,null,'d4',null,null,
         'b3',null,null,'d4',null,null,'c4',null,null,'b3',null,null,'b3',null,null,null,null,null],
  bass: ['g2',null,null,null,null,null,'g2',null,null,null,null,null,'g2',null,null,null,null,null,
         'c3',null,null,null,null,null,'d3',null,null,null,null,null,'g2',null,null,null,null,null,
         'g2',null,null,null,null,null,'c3',null,null,null,null,null,'a2',null,null,null,null,null,
         'd3',null,null,null,null,null,'d3',null,null,null,null,null,'g2',null,null,null,null,null],
  drums:['k',null,'h',null,'h',null,'k',null,'h',null,'h',null,'k',null,'h',null,'h',null,
         'k',null,'h',null,'h',null,'k',null,'h',null,'h',null,'k',null,'h',null,'h',null,
         'k',null,'h',null,'h',null,'k',null,'h',null,'h',null,'k',null,'h',null,'h',null,
         'k',null,'h',null,'h',null,'k',null,'h',null,'h',null,'k',null,null,null,null,null] };

// BOSS — driving D minor.
S.boss = { bpm: 170, sub: 2,
  lead: ['d4','d4','f4',null,'d4','d4','g4',null,'d4','d4','a4',null,'gs4',null,'g4','f4',
         'd4','d4','f4',null,'d4','d4','c5',null,'as4',null,'a4',null,'g4',null,'f4','e4',
         'd5',null,'c5',null,'as4',null,'a4',null,'g4','a4','as4','a4','g4',null,'f4','e4',
         'f4',null,'d4',null,'e4',null,'cs4',null,'d4',null,'d4',null,'d4',null,null,null],
  harm: ['d3',null,null,null,'d3',null,null,null,'d3',null,null,null,'d3',null,null,null,
         'as2',null,null,null,'as2',null,null,null,'a2',null,null,null,'a2',null,null,null,
         'g3',null,null,null,'f3',null,null,null,'e3',null,null,null,'e3',null,null,null,
         'f3',null,null,null,'a2',null,null,null,'d3',null,null,null,null,null,null,null],
  bass: ['d2','d2','d2','d2','d2','d2','d2','d2','d2','d2','d2','d2','d2','d2','d2','d2',
         'as1','as1','as1','as1','as1','as1','as1','as1','a1','a1','a1','a1','a1','a1','a1','a1',
         'g2','g2','g2','g2','f2','f2','f2','f2','e2','e2','e2','e2','e2','e2','e2','e2',
         'f2','f2','f2','f2','a1','a1','a1','a1','d2','d2','d2','d2','d2',null,null,null],
  drums:['k',null,'s',null,'k','k','s',null,'k',null,'s',null,'k','k','s',null,
         'k',null,'s',null,'k','k','s',null,'k',null,'s',null,'k','k','s',null,
         'k',null,'s',null,'k','k','s',null,'k',null,'s',null,'k','k','s',null,
         'k','k','s',null,'k','k','s',null,'k','k','s','s','k',null,'s',null] };

// ENDING — slow tender waltz.
S.ending = { bpm: 100, sub: 2,
  lead: ['d5',null,null,null,'b4',null,'g4',null,null,null,null,null,'c5',null,null,null,'a4',null,'fs4',null,null,null,null,null,
         'b4',null,null,null,'g4',null,'e4',null,null,null,null,null,'a4',null,'b4',null,'a4',null,'g4',null,null,null,null,null],
  harm: ['g4',null,null,'g4',null,null,'g4',null,null,'g4',null,null,'fs4',null,null,'fs4',null,null,'fs4',null,null,'fs4',null,null,
         'e4',null,null,'e4',null,null,'e4',null,null,'e4',null,null,'d4',null,null,'d4',null,null,'d4',null,null,'d4',null,null],
  bass: ['g2',null,null,null,null,null,'g2',null,null,null,null,null,'d2',null,null,null,null,null,'d2',null,null,null,null,null,
         'c2',null,null,null,null,null,'c2',null,null,null,null,null,'g2',null,null,null,null,null,'g2',null,null,null,null,null],
  drums: new Array(48).fill(null) };

S.title = S.sweden;

// ---------------- sequencer ----------------
export function playSong(name) {
  const song = S[name];
  if (!song || (current && current.name === name)) return;
  stopMusic();
  ctx();
  current = { name, song, step: 0, nextTime: ac.currentTime + 0.05 };
  current.timer = setInterval(schedule, 60);
}

export function stopMusic() {
  if (current) { clearInterval(current.timer); current = null; }
}

function schedule() {
  if (!current) return;
  const { song } = current;
  const stepDur = 60 / song.bpm / song.sub;
  while (current.nextTime < ac.currentTime + 0.25) {
    const i = current.step % song.lead.length;
    const t = current.nextTime;
    const L = song.lead[i], Hm = song.harm[i % song.harm.length],
          B = song.bass[i % song.bass.length], D = song.drums[i % song.drums.length];
    if (L && L !== '-') blip('square',   NOTE[L], t, stepDur * 1.8, .16, musicGain);
    if (Hm && Hm !== '-') blip('square', NOTE[Hm], t, stepDur * 1.6, .07, musicGain);
    if (B && B !== '-') blip('triangle', NOTE[B], t, stepDur * 1.9, .30, musicGain);
    if (D === 'k') { blip('sine', 110, t, .09, .5, musicGain, -70); }
    if (D === 's') noiseBurst(t, .08, .22, 1200, musicGain);
    if (D === 'h') noiseBurst(t, .03, .10, 6000, musicGain);
    current.step++;
    current.nextTime += stepDur;
  }
}

// ---------------- SFX ----------------
export const sfx = {
  jump()    { ctx(); blip('square', 320, ac.currentTime, .15, .18, master, 300); },
  slash()   { ctx(); noiseBurst(ac.currentTime, .09, .25, 2500); blip('square', 900, ac.currentTime, .06, .1, master, -500); },
  shoot()   { ctx(); blip('square', 1100, ac.currentTime, .08, .16, master, -800); noiseBurst(ac.currentTime, .04, .12, 3000); },
  boom()    { ctx(); noiseBurst(ac.currentTime, .5, .5, 60); blip('sine', 90, ac.currentTime, .4, .5, master, -60); },
  hurt()    { ctx(); blip('sawtooth', 200, ac.currentTime, .2, .25, master, -120); },
  enemyDie(){ ctx(); blip('square', 500, ac.currentTime, .2, .2, master, -420); noiseBurst(ac.currentTime, .12, .18, 900); },
  pickup()  { ctx(); blip('square', 660, ac.currentTime, .07, .18); blip('square', 990, ac.currentTime + .08, .1, .18); },
  bossRoar(){ ctx(); blip('sawtooth', 80, ac.currentTime, .7, .4, master, 60); noiseBurst(ac.currentTime, .5, .3, 200); },
  victory() { ctx(); [523, 659, 784, 1047].forEach((f, i) => blip('square', f, ac.currentTime + i * .13, .22, .2)); },
};
