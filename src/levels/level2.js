// Level 2 — Finally Out (Back on Track-inspired). Double spikes, stair climbs,
// two ship corridors, a tunnel with the first 2-cell shifts. ~75 s.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling, stairs, pad,
} from './helpers.js';

export default {
  id: 2,
  name: 'Finally Out',
  lengthCells: 660,
  song: 'song2',
  bg: { hue: 0x2288cc },
  objects: [
    // --- cube opener (0–138) ---
    spike(18),
    ...spikes(30, 0, 2),
    spike(41), block(42, 0, 3, 1),
    ...stairs(54, 3, 2),
    ...spikes(66, 0, 2),
    spike(75), block(76, 0, 4, 1),
    pad(87), spike(88),                 // intro pad: springs you clean over the spike
    checkpoint(99),
    ...spikes(108, 0, 2),
    block(118, 0, 3, 1), ...spikes(121, 0, 2), block(123, 1, 3, 1),
    spike(134),

    // --- ship one (138–210) ---
    portal(138, 'ship'),
    ceiling(140, 72, 5),
    block(154, 0, 1, 2),
    spikeDown(166, 4),
    block(178, 3, 2, 2),
    spike(190),
    block(202, 0, 1, 2),
    portal(210, 'cube', 0, 1, 5),      // full corridor height
    checkpoint(218),

    // --- cube midsection (212–316) ---
    ...spikes(228, 0, 2),
    block(238, 0, 1, 1),
    spike(243),
    ...stairs(252, 3, 2), spike(257, 2),
    ...spikes(266, 0, 2),
    pad(273),                           // required: chain starts 2 cells up
    block(276, 1, 3, 1), ...spikes(279, 0, 4), block(281, 2, 3, 1),
    spike(292),
    ...spikes(300, 0, 2),

    // --- triangle tunnel (318–422): first 2-cell shifts ---
    portal(319, 'triangle', 0, 1, 4),
    tunnel(318, 16, 1, 5),
    tunnel(334, 12, 2, 6),
    tspike(341, 'floor'),
    tunnel(346, 12, 4, 8),
    tspike(352, 'ceil'),
    tunnel(358, 12, 2, 6),
    tunnel(370, 12, 1, 5),
    tspike(376, 'floor'),
    tunnel(382, 12, 2, 6),
    tspike(388, 'ceil'),
    tunnel(394, 28, 1, 5),
    checkpoint(330),
    portal(418, 'cube', 1, 1, 4),

    // --- cube run (424–518) ---
    ...spikes(432, 0, 2),
    checkpoint(442),
    ...spikes(448, 0, 2),
    block(458, 0, 1, 1),
    spike(462),
    ...spikes(472, 0, 2),
    spike(481), block(482, 0, 4, 1),
    ...spikes(494, 0, 2),
    spike(504),

    // --- ship two (518–590) ---
    portal(518, 'ship'),
    ceiling(520, 70, 5),
    spikeDown(532, 4),
    block(544, 0, 1, 2),
    block(556, 3, 2, 2),
    checkpoint(561),
    spikeDown(568, 4),
    spike(576),
    portal(590, 'cube', 0, 1, 5),

    // --- closer (592–660) ---
    ...spikes(600, 0, 2),
    spike(610),
    spike(617), block(618, 0, 3, 1),
    ...spikes(630, 0, 2),
    spike(640),
    finish(654),
  ],
};
