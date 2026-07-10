// Persistent progression (localStorage): which levels are unlocked/cleared
// plus the hero's carried-over XP so progress survives a reload.

const KEY = 'sy_adventure_progress_v1';

export function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY));
    if (p && typeof p.unlocked === 'number') return p;
  } catch { /* corrupt save -> fresh start */ }
  return { unlocked: 1, cleared: {}, hero: null, danceBest: 0 };
}

export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
}

export function markCleared(p, levelIdx, levelId, hero) {
  p.cleared[levelId] = true;
  p.unlocked = Math.max(p.unlocked, levelIdx + 2);
  if (hero) p.hero = { xp: hero.xp, level: hero.level, score: hero.score };
  saveProgress(p);
}

// minigames unlock as the journey progresses
export const danceUnlocked = p => p.unlocked >= 2;   // clear Granada
export const duelUnlocked  = p => p.unlocked >= 3;   // clear Madrid
