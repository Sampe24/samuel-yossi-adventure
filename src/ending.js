// Midsummer sunset ending cutscene by the lake.

import { W, H, GROUND_Y, images, drawSprite, camera } from './engine.js';

export function makeEnding(game) {
  camera.x = 0; camera.shake = 0;
  return {
    t: 0,
    sam: { x: -80,  targetX: W / 2 - 90, who: 'samuel', facing: 1 },
    yos: { x: -150, targetX: W / 2 + 50, who: 'yossi',  facing: 1 },
    lines: [
      'After the crusaders of Granada...',
      'After the stone gods of Cusco...',
      'They finally came home.',
      'Midsummer. The lake. The endless sunset.',
      '',
      'SAMUEL ❤ YOSSI',
      '',
      'THE END',
    ],
  };
}

export function updateEnding(e, dt) {
  e.t += dt;
  for (const c of [e.sam, e.yos]) {
    if (c.x < c.targetX) { c.x = Math.min(c.targetX, c.x + 120 * dt); c.walking = true; }
    else c.walking = false;
  }
}

export function drawEnding(ctx, e) {
  // sunset background stretched to full canvas
  const img = images['bg_sunset'];
  if (img) ctx.drawImage(img, 0, 0, W, H);
  else { ctx.fillStyle = '#31174a'; ctx.fillRect(0, 0, W, H); }

  const gy = H - 60;
  for (const c of [e.sam, e.yos]) {
    const walkFrame = c.walking && Math.floor(e.t * 8) % 2;
    const celebrating = e.arrived && e.t - e.arrived > 12;   // fists up at the ❤ line
    const name = c.walking ? `${c.who}_run${walkFrame ? 1 : 2}`
               : celebrating ? `${c.who}_victory` : `${c.who}_idle`;
    // silhouette-ish: darkened sprites in the sunset
    ctx.save();
    ctx.filter = 'brightness(0.5) saturate(0.7)';
    const sx = c.x + camera.x;   // drawSprite subtracts camera.x (0)
    drawSprite(ctx, name, sx, gy, 92, 1);
    ctx.restore();
  }

  // fade-in credits, one line every 3 s once both arrived
  if (!e.sam.walking && !e.yos.walking) {
    e.arrived = e.arrived ?? e.t;
    const since = e.t - e.arrived - 1;
    ctx.textAlign = 'center';
    e.lines.forEach((line, i) => {
      const a = Math.max(0, Math.min(1, (since - i * 2.2) / 1.5));
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const big = line === 'THE END' || line.includes('❤');
      ctx.font = big ? 'bold 34px Georgia, serif' : 'italic 19px Georgia, serif';
      ctx.fillStyle = big ? '#ffe9a8' : '#ffd7c0';
      ctx.shadowColor = '#4a1a30'; ctx.shadowBlur = 8;
      ctx.fillText(line, W / 2, 90 + i * 40);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
    if (since > e.lines.length * 2.2 + 3) {
      ctx.font = '15px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('Press ENTER to return to title', W / 2, H - 24);
      e.done = true;
    }
  }
}
