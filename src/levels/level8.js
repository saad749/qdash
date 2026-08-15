// Level 8 — The Moons Turns Black. The **ship gauntlet**: three corridors take
// up more than half the level, and with roof and floor both lethal it is a
// flying test rather than a scenery change. Ground time is only enough to
// breathe between them. Electrodynamix's pressure, without speed portals. ~105 s.
//
// Corridor one is 5 rows to re-teach the controls; two and three are 4 rows with
// pillars alternating floor and roof, so the safe gap zig-zags.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling,
} from './helpers.js';

export default {
  id: 8,
  name: 'The Moons Turns Black',
  lengthCells: 920,
  song: 'song8',
  bg: { hue: 0x223355 },
  objects: [
    // --- cube opener (0–90): brief — this level is not about the ground ---
    ...spikes(16, 0, 2),
    spike(28),
    ...spikes(38, 0, 3),
    spike(52),
    block(60, 0, 1, 1),
    ...spikes(68, 0, 2),
    spike(80),

    // --- night flight one (95–262): 5 rows, room to settle ---
    portal(95, 'ship'),
    ceiling(99, 163, 5),
    block(110, 0, 1, 2),
    spikeDown(122, 4),
    block(134, 3, 2, 2),
    checkpoint(146),
    spike(158),
    spikeDown(170, 4),
    block(182, 0, 2, 2),
    block(194, 3, 2, 2),
    spike(206),
    spikeDown(218, 4),
    block(230, 0, 1, 2),
    block(242, 3, 2, 2),
    portal(256, 'cube', 0, 1, 5),

    // --- breather (268–340) ---
    ...spikes(272, 0, 2),
    spike(284),
    ...spikes(292, 0, 2),
    checkpoint(304),
    spike(316),
    ...spikes(326, 0, 2),

    // --- moonless tunnel (345–440): the one triangle stretch ---
    portal(346, 'triangle', 0, 1, 4),
    tunnel(345, 15, 1, 5),
    tunnel(360, 10, 2, 6),
    tspike(365, 'floor'),
    tunnel(370, 10, 1, 5),
    tspike(375, 'ceil'),
    tunnel(380, 10, 3, 7),
    tunnel(390, 20, 1, 5),
    tspike(400, 'floor'),
    tunnel(410, 12, 2, 6),
    tspike(416, 'ceil'),
    tunnel(422, 18, 1, 5),
    portal(432, 'cube', 1, 1, 4),

    // --- night flight two (445–620): 4 rows, pillars alternate floor and roof ---
    portal(445, 'ship'),
    ceiling(449, 171, 4),
    block(456, 0, 1, 2),
    checkpoint(464),
    spikeDown(472, 3),
    block(482, 2, 2, 2),
    spike(492),
    block(502, 0, 2, 2),
    spikeDown(512, 3),
    block(522, 2, 2, 2),
    spike(532),
    block(542, 0, 1, 2),
    spikeDown(552, 3),
    block(562, 2, 2, 2),
    spike(572),
    block(582, 0, 2, 2),
    spikeDown(592, 3),
    block(602, 2, 2, 2),
    portal(614, 'cube', 0, 1, 4),

    // --- breather (625–700) ---
    checkpoint(628),
    ...spikes(636, 0, 2),
    spike(648),
    ...spikes(658, 0, 3),
    spike(672),
    block(680, 0, 1, 1),
    ...spikes(688, 0, 2),

    // --- night flight three (705–880): the longest, no let-up ---
    portal(705, 'ship'),
    ceiling(709, 171, 4),
    block(716, 0, 1, 2),
    spikeDown(724, 3),
    block(732, 2, 2, 2),
    spike(740),
    block(748, 0, 2, 2),
    spikeDown(756, 3),
    block(764, 2, 2, 2),
    spike(772),
    checkpoint(782),
    block(790, 0, 1, 2),
    spikeDown(798, 3),
    block(806, 2, 2, 2),
    spike(814),
    block(822, 0, 2, 2),
    spikeDown(830, 3),
    block(838, 2, 2, 2),
    spike(846),
    block(854, 0, 1, 2),
    spikeDown(862, 3),
    portal(874, 'cube', 0, 1, 4),

    // --- touchdown (885–920): land it and cross ---
    finish(906),
  ],
};
