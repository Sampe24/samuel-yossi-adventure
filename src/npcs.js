// Ambient background NPCs: market stalls and townsfolk sliced from
// tools/raw/'background sprites.png' by tools/slice_npcs.py.
// Two-frame sets flip between frames; single-frame scenes get a subtle
// breathing bob so the background always feels alive.

import { GROUND_Y, drawSprite } from './engine.js';

// frames per animation + draw height (player draws at ~86px)
export const NPC_ANIMS = {
  granada: {
    stall: { frames: 1, h: 120 },
    idle:  { frames: 2, h: 88 }, pour:  { frames: 2, h: 88 },
    serve: { frames: 2, h: 88 }, wave:  { frames: 2, h: 88 },
  },
  cusco: {
    stall: { frames: 1, h: 120 },
    idle:  { frames: 2, h: 87 }, cook:  { frames: 2, h: 87 },
    serve: { frames: 2, h: 87 }, wipe:  { frames: 2, h: 87 },
  },
  sweden: {
    stall: { frames: 1, h: 115 },
    man_idle:   { frames: 2, h: 90 }, man_saw:    { frames: 2, h: 90 },
    man_hammer: { frames: 2, h: 90 }, man_carry:  { frames: 2, h: 90 },
    woman_idle: { frames: 2, h: 88 }, woman_plane:{ frames: 2, h: 88 },
    woman_paint:{ frames: 2, h: 88 }, woman_approve:{ frames: 2, h: 88 },
  },
  madrid: {
    stall: { frames: 1, h: 120 },
    idle:  { frames: 2, h: 88 }, fry:   { frames: 2, h: 88 },
    serve: { frames: 2, h: 88 }, wave:  { frames: 2, h: 88 },
  },
  lima: {
    stall: { frames: 1, h: 120 },
    idle:  { frames: 2, h: 88 }, chop:  { frames: 2, h: 88 },
    serve: { frames: 2, h: 88 }, wave:  { frames: 2, h: 88 },
  },
  jonkoping: {
    stall: { frames: 1, h: 120 },
    idle:  { frames: 2, h: 88 }, roll:  { frames: 2, h: 88 },
    serve: { frames: 2, h: 88 }, wave:  { frames: 2, h: 88 },
  },
};

export function npcAssetNames() {
  const names = [];
  for (const [lvl, sets] of Object.entries(NPC_ANIMS))
    for (const [set, cfg] of Object.entries(sets))
      for (let i = 0; i < cfg.frames; i++)
        names.push(`npc_${lvl}_${set}_${i}`);
  return names;
}

export function drawNpcs(ctx, level, camX, viewW) {
  const sets = NPC_ANIMS[level.id];
  if (!sets || !level.npcs) return;
  const t = performance.now() / 1000;
  for (const n of level.npcs) {
    const cfg = sets[n.set];
    if (!cfg) continue;
    if (n.x < camX - 200 || n.x > camX + viewW + 200) continue;
    const phase = (n.x * 0.37) % 1;                      // desync neighbours
    let h = cfg.h;
    let frame = 0;
    if (cfg.frames > 1) {
      frame = Math.floor(t / 0.6 + phase * 2) % cfg.frames;
    } else if (n.set !== 'stall') {
      h *= 1 + Math.sin(t * 3.2 + phase * 6.28) * 0.012; // breathing bob
    }
    drawSprite(ctx, `npc_${level.id}_${n.set}_${frame}`,
               n.x, GROUND_Y + 2, h, n.face || 1);
  }
}
