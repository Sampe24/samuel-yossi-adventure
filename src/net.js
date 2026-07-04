// Online co-op over PeerJS (WebRTC). Host is authoritative for enemies,
// bosses, pickups and game phase; each peer owns its own player.

const PREFIX = 'sy-adventure-';

export const net = {
  role: 'solo',          // 'solo' | 'host' | 'guest'
  conn: null, peer: null,
  code: null,
  remoteState: null,     // last received remote-player state
  hostState: null,       // last received world snapshot (guest side)
  guestEvents: [],       // action events from guest, applied by host
  connected: false,
  onStatus: () => {},
};

function makeCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}

export function hostGame(onReady, forcedCode = null) {
  net.role = 'host';
  net.code = forcedCode || makeCode();
  net.peer = new Peer(PREFIX + net.code);
  net.peer.on('open', () => onReady(net.code));
  net.peer.on('error', e => net.onStatus('Network error: ' + e.type));
  net.peer.on('connection', conn => {
    net.conn = conn;
    conn.on('data', handleData);
    conn.on('open', () => { net.connected = true; net.onStatus('PARTNER JOINED!'); });
    conn.on('close', () => { net.connected = false; net.onStatus('Partner disconnected'); });
  });
}

export function joinGame(code, onFail) {
  net.role = 'guest';
  net.code = code.toUpperCase();
  net.peer = new Peer();
  net.peer.on('disconnected', () => net.onStatus('broker disconnected'));
  net.peer.on('close', () => net.onStatus('peer closed'));
  net.peer.on('open', id => {
    net.onStatus('broker ok (' + id.slice(0, 6) + '…), contacting host…');
    const conn = net.peer.connect(PREFIX + net.code, { reliable: false });
    net.conn = conn;
    conn.on('data', handleData);
    conn.on('open', () => { net.connected = true; net.onStatus('CONNECTED!'); });
    conn.on('close', () => { net.connected = false; net.onStatus('Host disconnected'); });
    setTimeout(() => { if (!net.connected) onFail('Could not reach host — check the code.'); }, 8000);
  });
  net.peer.on('error', e => onFail('Network error: ' + e.type));
}

function handleData(msg) {
  if (msg.t === 'p') {                       // remote player state
    net.remoteState = msg;
    if (msg.ev && msg.ev.length) net.guestEvents.push(...msg.ev);
  } else if (msg.t === 'world') {
    net.hostState = msg;
  } else if (msg.t === 'start') {
    net.startInfo = msg;                     // {level, hostWho}
  }
}

export function send(msg) {
  if (net.conn && net.connected) { try { net.conn.send(msg); } catch (e) { /* drop */ } }
}

// serialize own player (both sides, ~30 Hz — every other frame)
export function playerPacket(p, events) {
  return { t: 'p', x: Math.round(p.x), y: Math.round(p.y), f: p.facing,
           a: p.action, hp: p.hp, dead: p.dead, vx: p.vx, og: p.onGround,
           ev: events };
}

// host world snapshot (~15 Hz)
export function worldPacket(game) {
  return {
    t: 'world',
    ph: game.phase, li: game.levelIdx,
    en: game.enemies.map(e => ({ id: e.id, ty: e.type, x: Math.round(e.x),
                                 y: Math.round(e.y), hp: e.hp, f: e.facing })),
    bo: game.boss ? { ty: game.boss.type, x: Math.round(game.boss.x),
                      y: Math.round(game.boss.y), hp: game.boss.hp,
                      f: game.boss.facing, st: game.boss.state } : null,
    bu: game.bullets.map(b => ({ x: Math.round(b.x), y: Math.round(b.y),
                                 fr: b.from, c: b.color, fi: b.fire, w: b.w })),
    pk: game.pickups.map(k => ({ ty: k.type, x: k.x, y: k.y, got: k.got })),
    ghp: game.other ? game.other.hp : 0,
  };
}

export function closeNet() {
  try { if (net.peer) net.peer.destroy(); } catch (e) { /* ignore */ }
  net.role = 'solo'; net.conn = null; net.peer = null; net.connected = false;
  net.remoteState = null; net.hostState = null; net.guestEvents = [];
}
