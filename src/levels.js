// Level definitions: 3 levels + boss arenas. x positions in world pixels.

export const LEVELS = [
  {
    id: 'granada',
    name: 'LEVEL 1 — GRANADA',
    subtitle: 'Fight through the old town to the Alhambra',
    bg: 'bg_granada', music: 'granada', tile: 'tile_granada',
    // the backdrop is one stitched mural across the city: old town with the
    // Alhambra -> Tonito's park at the Triunfo -> Rio Genil -> Paseo del
    // Salon. Landmark names pop as each seam scrolls past (positions are
    // derived from the stitched image widths at runtime).
    bgSegments: ['bg_granada', 'bg_gr_triunfo', 'bg_gr_genil', 'bg_gr_salon'],
    landmarks: ['PLAZA DEL TRIUNFO', 'RÍO GENIL', 'PASEO DEL SALÓN'],
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
    // blossoming trees as soft mid-ground props (landmarks themselves live
    // in the background segments so the streets feel continuous)
    decor: [
      { img: 'deco_blossom', x: 660,  h: 175 },
      { img: 'deco_blossom', x: 2350, h: 175, face: -1 },
      { img: 'deco_blossom', x: 3900, h: 175 },
      { img: 'deco_blossom', x: 5150, h: 175, face: -1 },
    ],
    // ambient townsfolk (Arabic teashop) drawn behind the action
    npcs: [
      { set: 'stall', x: 430 }, { set: 'pour', x: 545 },
      { set: 'idle', x: 980, face: -1 },
      { set: 'serve', x: 1650 }, { set: 'wave', x: 2150, face: -1 },
      { set: 'idle', x: 3060 }, { set: 'serve', x: 3860, face: -1 },
      { set: 'wave', x: 5060 },
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
    id: 'madrid',
    name: 'LEVEL 2 — MADRID',
    subtitle: 'Bulls and blades on the Plaza Mayor',
    bg: 'bg_madrid', music: 'madrid', tile: 'tile_madrid',
    length: 5800, checkpoint: 3000,
    groundTop: '#b9a48a', groundBottom: '#7a6a52', platColor: '#a08a6a',
    platforms: [
      { x: 720,  y: 350, w: 190, h: 22 },
      { x: 960,  y: 250, w: 140, h: 22 },
      { x: 1200, y: 320, w: 170, h: 22 },   // spans pit 1
      { x: 1550, y: 330, w: 160, h: 22 },   // ladder up here
      { x: 1770, y: 230, w: 140, h: 22 },
      { x: 2400, y: 360, w: 220, h: 22 },
      { x: 2660, y: 280, w: 150, h: 22 },   // spans pit 2
      { x: 3350, y: 330, w: 170, h: 22 },   // ladder up here
      { x: 3570, y: 230, w: 150, h: 22 },
      { x: 4300, y: 350, w: 200, h: 22 },
      { x: 4560, y: 270, w: 150, h: 22 },   // spans pit 3
      // high route: balcony rooftops
      { x: 2000, y: 210, w: 140, h: 22 },
      { x: 2210, y: 250, w: 130, h: 22 },
      { x: 3800, y: 210, w: 150, h: 22 },
      { x: 4020, y: 250, w: 140, h: 22 },
    ],
    pits: [
      { x: 1220, w: 170 }, { x: 2670, w: 180 }, { x: 4570, w: 180 },
    ],
    ladders: [
      { x: 1610, y: 330, w: 26, h: 140 },
      { x: 3410, y: 330, w: 26, h: 140 },
    ],
    spawns: [
      { type: 'matador', x: 820 },  { type: 'toro', x: 1120 },
      { type: 'matador', x: 1650 }, { type: 'gargoyle', x: 1950 },
      { type: 'toro', x: 2250 },    { type: 'matador', x: 2450 },
      { type: 'gargoyle', x: 2950 },{ type: 'matador', x: 3100 },
      { type: 'toro', x: 3500 },    { type: 'matador', x: 3850 },
      { type: 'gargoyle', x: 4150 },{ type: 'toro', x: 4380 },
      { type: 'matador', x: 4850 }, { type: 'toro', x: 5050 },
    ],
    pickups: [
      { type: 'ammo', x: 770,  py: 350 }, { type: 'nade', x: 1830, py: 230 },
      { type: 'heart', x: 2470, py: 360 },{ type: 'ammo', x: 3410, py: 330 },
      { type: 'nade', x: 3630, py: 230 }, { type: 'ammo', x: 4360, py: 350 },
      { type: 'ammo', x: 5250 }, { type: 'heart', x: 5400 },
      { type: 'heart', x: 2050, py: 210 }, { type: 'nade', x: 3850, py: 210 },  // high route
    ],
    // ambient townsfolk (churros stall) drawn behind the action
    npcs: [
      { set: 'stall', x: 440 }, { set: 'fry', x: 560 },
      { set: 'idle', x: 1000, face: -1 },
      { set: 'serve', x: 1700 }, { set: 'wave', x: 2220, face: -1 },
      { set: 'idle', x: 3120 }, { set: 'serve', x: 3920, face: -1 },
      { set: 'wave', x: 5150 },
    ],
    boss: { type: 'boss_madrid', bg: 'bg_madrid', music: 'boss',
            intro: 'THE BRONZE BULL AWAKENS...' },
  },
  {
    id: 'sevilla',
    name: 'LEVEL 3 — SEVILLA',
    subtitle: 'Bandoleros and duendes under the Giralda',
    bg: 'bg_sevilla', music: 'sevilla', tile: 'tile_sevilla',
    length: 5800, checkpoint: 2950,
    groundTop: '#d8b98a', groundBottom: '#9a7a54', platColor: '#c49a68',
    platforms: [
      { x: 700,  y: 350, w: 190, h: 22 },
      { x: 940,  y: 250, w: 140, h: 22 },
      { x: 1180, y: 320, w: 170, h: 22 },   // spans pit 1
      { x: 1520, y: 330, w: 160, h: 22 },   // ladder up here
      { x: 1740, y: 230, w: 140, h: 22 },
      { x: 2380, y: 360, w: 220, h: 22 },
      { x: 2640, y: 280, w: 150, h: 22 },   // spans pit 2
      { x: 3320, y: 330, w: 170, h: 22 },   // ladder up here
      { x: 3540, y: 230, w: 150, h: 22 },
      { x: 4250, y: 350, w: 200, h: 22 },
      { x: 4510, y: 270, w: 150, h: 22 },   // spans pit 3
      // high route: azulejo rooftops
      { x: 1970, y: 210, w: 140, h: 22 },
      { x: 2180, y: 250, w: 130, h: 22 },
      { x: 3770, y: 210, w: 150, h: 22 },
      { x: 3990, y: 250, w: 140, h: 22 },
    ],
    pits: [
      { x: 1200, w: 170 }, { x: 2650, w: 180 }, { x: 4520, w: 180 },
    ],
    ladders: [
      { x: 1580, y: 330, w: 26, h: 140 },
      { x: 3380, y: 330, w: 26, h: 140 },
    ],
    spawns: [
      { type: 'bandolero', x: 820 }, { type: 'duende', x: 1100 },
      { type: 'matador', x: 1620 },  { type: 'duende', x: 1920 },
      { type: 'bandolero', x: 2220 },{ type: 'matador', x: 2420 },
      { type: 'duende', x: 2920 },   { type: 'bandolero', x: 3080 },
      { type: 'matador', x: 3480 },  { type: 'bandolero', x: 3820 },
      { type: 'duende', x: 4120 },   { type: 'matador', x: 4320 },
      { type: 'bandolero', x: 4820 },{ type: 'duende', x: 5020 },
    ],
    pickups: [
      { type: 'ammo', x: 750,  py: 350 }, { type: 'nade', x: 1800, py: 230 },
      { type: 'heart', x: 2450, py: 360 },{ type: 'ammo', x: 3380, py: 330 },
      { type: 'nade', x: 3600, py: 230 }, { type: 'ammo', x: 4310, py: 350 },
      { type: 'ammo', x: 5200 }, { type: 'heart', x: 5350 },
      { type: 'heart', x: 2020, py: 210 }, { type: 'nade', x: 3820, py: 210 },  // high route
    ],
    // ambient townsfolk (orange juice stall) drawn behind the action
    npcs: [
      { set: 'stall', x: 440 }, { set: 'juice', x: 560 },
      { set: 'idle', x: 1000, face: -1 },
      { set: 'serve', x: 1700 }, { set: 'wave', x: 2200, face: -1 },
      { set: 'idle', x: 3100 }, { set: 'serve', x: 3900, face: -1 },
      { set: 'wave', x: 5100 },
    ],
    boss: { type: 'boss_sevilla', bg: 'bg_sevilla', music: 'boss',
            intro: 'THE GIRALDA STATUE DESCENDS...' },
  },
  {
    id: 'cusco',
    name: 'LEVEL 4 — CUSCO',
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
    // ambient townsfolk (Peruvian food stand) drawn behind the action
    npcs: [
      { set: 'stall', x: 470 }, { set: 'cook', x: 585 },
      { set: 'idle', x: 1000, face: -1 },
      { set: 'serve', x: 1760 }, { set: 'wipe', x: 2160, face: -1 },
      { set: 'cook', x: 2700 }, { set: 'serve', x: 3620 },
      { set: 'idle', x: 4310, face: -1 }, { set: 'wipe', x: 5350 },
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
    id: 'lima',
    name: 'LEVEL 5 — LIMA',
    subtitle: 'Ghost pirates haunt the Pacific coast',
    bg: 'bg_lima', music: 'lima', tile: 'tile_lima',
    length: 6000, checkpoint: 3400,
    groundTop: '#c9b896', groundBottom: '#8a7a5d', platColor: '#b0906a',
    platforms: [
      { x: 640,  y: 350, w: 200, h: 22 },
      { x: 870,  y: 250, w: 140, h: 22 },
      { x: 1370, y: 320, w: 190, h: 22 },   // spans pit 1
      { x: 2340, y: 350, w: 240, h: 22 },   // ladder up here
      { x: 2610, y: 250, w: 150, h: 22 },
      { x: 3070, y: 310, w: 180, h: 22 },   // spans pit 2
      { x: 3640, y: 350, w: 180, h: 22 },
      { x: 3860, y: 250, w: 150, h: 22 },
      { x: 4140, y: 350, w: 200, h: 22 },   // ladder up here
      { x: 4720, y: 290, w: 170, h: 22 },   // spans pit 3
      { x: 4990, y: 340, w: 180, h: 22 },
      // high route: balcony walkways
      { x: 1120, y: 230, w: 140, h: 22 },
      { x: 1600, y: 250, w: 150, h: 22 },
      { x: 2830, y: 220, w: 150, h: 22 },
      { x: 3390, y: 230, w: 140, h: 22 },
    ],
    pits: [
      { x: 1400, w: 170 }, { x: 3090, w: 180 }, { x: 4740, w: 160 },
    ],
    ladders: [
      { x: 2420, y: 350, w: 26, h: 120 },
      { x: 4200, y: 350, w: 26, h: 120 },
    ],
    spawns: [
      { type: 'pirata', x: 890 },   { type: 'pelicano', x: 1240 },
      { type: 'pirata', x: 1740 },  { type: 'inca', x: 2040 },
      { type: 'pelicano', x: 2480 },{ type: 'pirata', x: 2720 },
      { type: 'inca', x: 3000 },    { type: 'pirata', x: 3390 },
      { type: 'pelicano', x: 3740 },{ type: 'pirata', x: 3920 },
      { type: 'pelicano', x: 4290 },{ type: 'inca', x: 4540 },
      { type: 'pirata', x: 5020 },  { type: 'pelicano', x: 5140 },
      { type: 'pirata', x: 5440 },
    ],
    pickups: [
      { type: 'ammo', x: 690, py: 350 },  { type: 'nade', x: 920, py: 250 },
      { type: 'heart', x: 2420, py: 350 },{ type: 'ammo', x: 2670, py: 250 },
      { type: 'nade', x: 3920, py: 250 }, { type: 'ammo', x: 4220, py: 350 },
      { type: 'heart', x: 4780, py: 290 },{ type: 'ammo', x: 5540 },
      { type: 'heart', x: 5690 },
      { type: 'ammo', x: 1170, py: 230 }, { type: 'heart', x: 2880, py: 220 },  // high route
    ],
    // ambient townsfolk (ceviche cart) drawn behind the action
    npcs: [
      { set: 'stall', x: 470 }, { set: 'chop', x: 600 },
      { set: 'idle', x: 1010, face: -1 },
      { set: 'serve', x: 1780 }, { set: 'chop', x: 2200, face: -1 },
      { set: 'wave', x: 2760 }, { set: 'serve', x: 3660 },
      { set: 'idle', x: 4360, face: -1 }, { set: 'wave', x: 5420 },
    ],
    boss: { type: 'boss_lima', bg: 'bg_lima', music: 'boss',
            intro: 'A COLD WIND FROM THE PACIFIC...' },
  },
  {
    id: 'sweden',
    name: 'LEVEL 6 — SVERIGE',
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
    // ambient townsfolk (Swedish woodworkers) drawn behind the action
    npcs: [
      { set: 'stall', x: 470 }, { set: 'man_hammer', x: 590 },
      { set: 'woman_idle', x: 700, face: -1 },
      { set: 'man_saw', x: 1020 }, { set: 'woman_plane', x: 1660 },
      { set: 'man_carry', x: 2260 }, { set: 'woman_paint', x: 3120, face: -1 },
      { set: 'man_idle', x: 3560 }, { set: 'woman_approve', x: 4620, face: -1 },
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
    boss: null,   // no boss here — the road home leads on to Jönköping
  },
  {
    id: 'jonkoping',
    name: 'FINAL LEVEL — JÖNKÖPING',   // level 7
    subtitle: 'Home at last... but Lake Vättern is stirring',
    bg: 'bg_jonkoping', music: 'jonkoping', tile: 'tile_jonkoping',
    length: 5400, checkpoint: 2700,
    groundTop: '#8a9a6e', groundBottom: '#4c5e3b', platColor: '#8a7a5c',
    platforms: [
      { x: 820,  y: 350, w: 190, h: 22 },   // lakeside piers
      { x: 1050, y: 250, w: 130, h: 22 },
      { x: 1260, y: 320, w: 170, h: 22 },   // spans pit 1
      { x: 1850, y: 330, w: 190, h: 22 },   // ladder up here
      { x: 2070, y: 230, w: 140, h: 22 },
      { x: 2680, y: 300, w: 170, h: 22 },   // spans pit 2
      { x: 2950, y: 350, w: 210, h: 22 },
      { x: 3850, y: 330, w: 190, h: 22 },
      { x: 3990, y: 250, w: 160, h: 22 },   // spans pit 3
      // high route: rooftop path
      { x: 2320, y: 210, w: 140, h: 22 },
      { x: 2510, y: 260, w: 130, h: 22 },
      { x: 3350, y: 260, w: 150, h: 22 },
      { x: 3600, y: 220, w: 140, h: 22 },
    ],
    pits: [
      { x: 1280, w: 170 }, { x: 2700, w: 180 }, { x: 4010, w: 160 },
    ],
    ladders: [
      { x: 1910, y: 330, w: 26, h: 140 },
      { x: 3010, y: 350, w: 26, h: 120 },
    ],
    spawns: [
      { type: 'vittra', x: 920 },  { type: 'huldra', x: 1580 },
      { type: 'vittra', x: 1950 }, { type: 'troll', x: 2480 },
      { type: 'huldra', x: 2980 }, { type: 'vittra', x: 3430 },
      { type: 'nacken', x: 3880 }, { type: 'vittra', x: 4330 },
      { type: 'huldra', x: 4650 }, { type: 'troll', x: 4900 },
    ],
    pickups: [
      { type: 'heart', x: 870, py: 350 }, { type: 'nade', x: 1100, py: 250 },
      { type: 'ammo', x: 1920, py: 330 }, { type: 'heart', x: 2130, py: 230 },
      { type: 'heart', x: 3000, py: 350 },{ type: 'ammo', x: 3920, py: 330 },
      { type: 'heart', x: 4700 },
      { type: 'heart', x: 2370, py: 210 }, { type: 'ammo', x: 3650, py: 220 },  // high route
    ],
    // ambient townsfolk (polkagris candy stand) drawn behind the action
    npcs: [
      { set: 'stall', x: 460 }, { set: 'roll', x: 585 },
      { set: 'idle', x: 1000, face: -1 },
      { set: 'serve', x: 1760 }, { set: 'wave', x: 2260, face: -1 },
      { set: 'roll', x: 3120 }, { set: 'serve', x: 3920, face: -1 },
      { set: 'wave', x: 4880 },
    ],
    boss: { type: 'boss_jonkoping', bg: 'bg_jonkoping', music: 'boss',
            intro: 'SOMETHING RISES FROM LAKE VÄTTERN...' },
  },
];
