// Level definitions: 3 levels + boss arenas. x positions in world pixels.

export const LEVELS = [
  {
    id: 'granada',
    name: 'LEVEL 1 — GRANADA',
    subtitle: 'Fight through the old town to the Alhambra',
    bg: 'bg_granada', music: 'granada', tile: 'tile_granada',
    length: 5600, checkpoint: 2900,
    groundTop: '#c9a06a', groundBottom: '#8a6437', platColor: '#b98d55',
    platforms: [
      { x: 700,  y: 350, w: 180, h: 22 },   // ramp up...
      { x: 940,  y: 250, w: 140, h: 22 },   // ...higher
      { x: 1170, y: 320, w: 170, h: 22 },   // spans pit 1
      { x: 1500, y: 330, w: 160, h: 22 },   // ladder up here
      { x: 1720, y: 230, w: 140, h: 22 },   // rooftop with loot
      { x: 2350, y: 360, w: 220, h: 22 },
      { x: 2610, y: 280, w: 150, h: 22 },   // spans pit 2
      { x: 3300, y: 330, w: 170, h: 22 },   // ladder up here
      { x: 3520, y: 230, w: 150, h: 22 },
      { x: 4200, y: 350, w: 200, h: 22 },
      { x: 4460, y: 270, w: 150, h: 22 },   // spans pit 3
      // high route (Sonic-style alternate path): rooftops with loot
      { x: 1950, y: 210, w: 140, h: 22 },
      { x: 2160, y: 250, w: 130, h: 22 },
      { x: 3740, y: 210, w: 150, h: 22 },
      { x: 3960, y: 250, w: 140, h: 22 },
    ],
    pits: [
      { x: 1190, w: 170 }, { x: 2620, w: 180 }, { x: 4470, w: 180 },
    ],
    ladders: [
      { x: 1560, y: 330, w: 26, h: 140 },
      { x: 3360, y: 330, w: 26, h: 140 },
    ],
    spawns: [
      { type: 'crusader', x: 800 },  { type: 'jihadist', x: 1080 },
      { type: 'crusader', x: 1600 }, { type: 'gargoyle', x: 1900 },
      { type: 'jihadist', x: 2200 }, { type: 'jihadist', x: 2380 },
      { type: 'gargoyle', x: 2900 }, { type: 'crusader', x: 3050 },
      { type: 'crusader', x: 3450 }, { type: 'jihadist', x: 3800 },
      { type: 'gargoyle', x: 4100 }, { type: 'gargoyle', x: 4300 },
      { type: 'crusader', x: 4750 }, { type: 'jihadist', x: 4950 },
    ],
    pickups: [
      { type: 'ammo', x: 750,  py: 350 }, { type: 'nade', x: 1780, py: 230 },
      { type: 'heart', x: 2420, py: 360 },{ type: 'ammo', x: 3360, py: 330 },
      { type: 'nade', x: 3580, py: 230 }, { type: 'ammo', x: 4260, py: 350 },
      { type: 'ammo', x: 5100 }, { type: 'heart', x: 5250 },
      { type: 'heart', x: 2000, py: 210 }, { type: 'nade', x: 3790, py: 210 },  // high route
    ],
    boss: { type: 'boss_alhambra', bg: 'bg_alhambra', music: 'boss',
            intro: 'INSIDE THE ALHAMBRA...' },
  },
  {
    id: 'cusco',
    name: 'LEVEL 2 — CUSCO',
    subtitle: 'The ancient warriors of the Andes awaken',
    bg: 'bg_cusco', music: 'cusco', tile: 'tile_cusco',
    length: 6000, checkpoint: 3450,
    groundTop: '#9b8b70', groundBottom: '#5d5140', platColor: '#847661',
    platforms: [
      { x: 600,  y: 350, w: 200, h: 22 },   // Inca terrace steps
      { x: 830,  y: 250, w: 140, h: 22 },
      { x: 1330, y: 320, w: 190, h: 22 },   // spans pit 1
      { x: 2300, y: 350, w: 240, h: 22 },   // ladder up here
      { x: 2570, y: 250, w: 150, h: 22 },
      { x: 3030, y: 310, w: 180, h: 22 },   // spans pit 2
      { x: 3600, y: 350, w: 180, h: 22 },
      { x: 3820, y: 250, w: 150, h: 22 },
      { x: 4100, y: 350, w: 200, h: 22 },   // ladder up here
      { x: 4680, y: 290, w: 170, h: 22 },   // spans pit 3
      { x: 4950, y: 340, w: 180, h: 22 },
      // high route: upper terraces
      { x: 1080, y: 230, w: 140, h: 22 },
      { x: 1560, y: 250, w: 150, h: 22 },
      { x: 2790, y: 220, w: 150, h: 22 },
      { x: 3350, y: 230, w: 140, h: 22 },
    ],
    pits: [
      { x: 1360, w: 170 }, { x: 3050, w: 180 }, { x: 4700, w: 160 },
    ],
    ladders: [
      { x: 2380, y: 350, w: 26, h: 120 },
      { x: 4160, y: 350, w: 26, h: 120 },
    ],
    spawns: [
      { type: 'inca', x: 850 },   { type: 'supay', x: 1200 },
      { type: 'inca', x: 1700 },  { type: 'condor', x: 2000 },
      { type: 'supay', x: 2440 }, { type: 'inca', x: 2680 },
      { type: 'condor', x: 2960 },{ type: 'supay', x: 3350 },
      { type: 'inca', x: 3700 },  { type: 'inca', x: 3880 },
      { type: 'condor', x: 4250 },{ type: 'supay', x: 4500 },
      { type: 'supay', x: 4980 }, { type: 'condor', x: 5100 },
      { type: 'inca', x: 5400 },
    ],
    pickups: [
      { type: 'ammo', x: 650, py: 350 },  { type: 'nade', x: 880, py: 250 },
      { type: 'heart', x: 2380, py: 350 },{ type: 'ammo', x: 2630, py: 250 },
      { type: 'nade', x: 3880, py: 250 }, { type: 'ammo', x: 4180, py: 350 },
      { type: 'heart', x: 4740, py: 290 },{ type: 'ammo', x: 5500 },
      { type: 'heart', x: 5650 },
      { type: 'ammo', x: 1130, py: 230 }, { type: 'heart', x: 2840, py: 220 },  // high route
    ],
    boss: { type: 'boss_cusco', bg: 'bg_cusco', music: 'boss',
            intro: 'THE PLAZA DE ARMAS TREMBLES...' },
  },
  {
    id: 'sweden',
    name: 'LEVEL 3 — SVERIGE',
    subtitle: 'Almost home... trolls in the midsummer woods',
    bg: 'bg_sweden', music: 'sweden', tile: 'tile_sweden',
    length: 5200, checkpoint: 2550,
    groundTop: '#6fa84e', groundBottom: '#3c5e2b', platColor: '#7d5a3a',
    platforms: [
      { x: 800,  y: 350, w: 190, h: 22 },   // forest ledges
      { x: 1030, y: 250, w: 130, h: 22 },
      { x: 1230, y: 320, w: 170, h: 22 },   // spans pit 1
      { x: 1800, y: 330, w: 190, h: 22 },   // ladder up here
      { x: 2020, y: 230, w: 140, h: 22 },
      { x: 2630, y: 300, w: 170, h: 22 },   // spans pit 2
      { x: 2900, y: 350, w: 210, h: 22 },
      { x: 3800, y: 330, w: 190, h: 22 },
      { x: 3940, y: 250, w: 160, h: 22 },   // spans pit 3
      // high route: treetop path
      { x: 2270, y: 210, w: 140, h: 22 },
      { x: 2460, y: 260, w: 130, h: 22 },
      { x: 3300, y: 260, w: 150, h: 22 },
      { x: 3550, y: 220, w: 140, h: 22 },
    ],
    pits: [
      { x: 1250, w: 170 }, { x: 2650, w: 180 }, { x: 3960, w: 160 },
    ],
    ladders: [
      { x: 1860, y: 330, w: 26, h: 140 },
      { x: 2960, y: 350, w: 26, h: 120 },
    ],
    spawns: [
      { type: 'troll', x: 900 },  { type: 'nacken', x: 1550 },
      { type: 'troll', x: 1900 }, { type: 'troll', x: 2450 },
      { type: 'nacken', x: 2950 },{ type: 'troll', x: 3400 },
      { type: 'nacken', x: 3850 },{ type: 'troll', x: 4300 },
    ],
    pickups: [
      { type: 'heart', x: 850, py: 350 }, { type: 'nade', x: 1080, py: 250 },
      { type: 'ammo', x: 1870, py: 330 }, { type: 'heart', x: 2080, py: 230 },
      { type: 'heart', x: 2950, py: 350 },{ type: 'ammo', x: 3870, py: 330 },
      { type: 'heart', x: 4600 },
      { type: 'heart', x: 2320, py: 210 }, { type: 'ammo', x: 3600, py: 220 },  // high route
    ],
    boss: null,   // ends in the midsummer sunset instead
  },
];
