// Drive two headless Chromes via CDP: host + guest PeerJS co-op test,
// with real time and real networking. Also captures gameplay screenshots.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const code = 'T' + Math.floor(Math.random() * 9000 + 1000);
const shotDir = process.argv[2] || '.';
const mode = process.argv[3] || 'net';   // 'net' or 'solo'
const BASE = process.argv[4] || 'http://localhost:8642/index.html';
const MATCH = BASE.split('/')[2];

function launch(port, url) {
  const dir = mkdtempSync(join(tmpdir(), 'chr-'));
  return spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--window-size=960,540', url,
  ], { stdio: 'ignore' });
}

async function attach(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
      const page = list.find(t => t.type === 'page' && t.url.includes(MATCH));
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        let id = 0; const pend = new Map();
        ws.onmessage = ev => {
          const m = JSON.parse(ev.data);
          if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
        };
        return {
          ws,
          cmd: (method, params = {}) => new Promise(res => {
            const i2 = ++id; pend.set(i2, res);
            ws.send(JSON.stringify({ id: i2, method, params }));
          }),
        };
      }
    } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('cannot attach to chrome on ' + port);
}

const evalIn = async (c, expr) =>
  (await c.cmd('Runtime.evaluate', { expression: expr, returnByValue: true }))
    ?.result?.value;

async function shot(c, name) {
  const r = await c.cmd('Page.captureScreenshot', { format: 'png' });
  if (r?.data) writeFileSync(join(shotDir, name), Buffer.from(r.data, 'base64'));
  console.log('shot saved:', name);
}

const procs = [];
try {
  if (mode === 'solo') {
    // Visual playthrough screenshots in real time.
    procs.push(launch(9231, BASE));
    const c = await attach(9231);
    await c.cmd('Page.enable');
    await new Promise(r => setTimeout(r, 3500));
    await shot(c, 'shot_title.png');
    await evalIn(c, `document.getElementById('btnSolo').click()`);
    await new Promise(r => setTimeout(r, 2500));
    // run right for a while
    await evalIn(c, `window.__k = window.gameKeys`);
    await evalIn(c, `import('./src/engine.js').then(m => { m.keys['d']=true; m.keys['k']=true; })`);
    await new Promise(r => setTimeout(r, 4000));
    await shot(c, 'shot_granada.png');
    await evalIn(c, `game.me.x = game.level.length - 300; game.me.inv = 5;`);
    await new Promise(r => setTimeout(r, 3500));
    await shot(c, 'shot_boss.png');
    // skip to cusco
    await evalIn(c, `game.boss && (game.boss.hp = 1)`);
    await new Promise(r => setTimeout(r, 6000));
    await shot(c, 'shot_cusco.png');
    await new Promise(r => setTimeout(r, 1500));
    await shot(c, 'shot_l2.png');
    await evalIn(c, `window.debugEnding()`);
    await new Promise(r => setTimeout(r, 9000));
    await shot(c, 'shot_ending.png');
    console.log('errlog:', await evalIn(c, `document.getElementById('errlog').textContent`));
  } else {
    procs.push(launch(9231, `${BASE}?autohost=${code}`));
    procs.push(launch(9232, `${BASE}?autojoin=${code}`));
    const host = await attach(9231), guest = await attach(9232);
    await host.cmd('Page.enable'); await guest.cmd('Page.enable');
    console.log('testing with code', code);
    for (let t = 0; t < 14; t++) {
      await new Promise(r => setTimeout(r, 2000));
      const h = await evalIn(host, `document.getElementById('errlog').textContent.split('\\n').filter(Boolean).slice(-1)[0]`);
      const g = await evalIn(guest, `document.getElementById('errlog').textContent.split('\\n').filter(Boolean).slice(-1)[0]`);
      console.log(`H: ${h}\nG: ${g}`);
      if (t === 10) { await shot(host, 'shot_net_host.png'); await shot(guest, 'shot_net_guest.png'); }
    }
    const full = await evalIn(host, `document.getElementById('errlog').textContent`);
    console.log('--- host full log tail ---\n' + full.split('\n').slice(0, 12).join('\n'));
  }
} finally {
  for (const p of procs) try { p.kill(); } catch {}
}
console.log('CDP test finished');
