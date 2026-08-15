// Level 7 — The Darks Starts to Spread. The **form churn** level: ten sections
// in 890 cells, so the form changes roughly every eight seconds and you never
// settle into one set of reflexes. Hexagon Force's structure — the difficulty
// lives in the seams rather than in any single obstacle. ~102 s.
//
// Three tunnels narrowing as they go (5 → 4 → 3 wide) and two ship corridors,
// the second tighter than the first: the dark spreading is the sections getting
// meaner, not longer.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling, pad,
} from './helpers.js';

export default {
  id: 7,
  name: 'The Darks Starts to Spread',
  lengthCells: 890,
  song: 'song7',
  bg: { hue: 0x553388 },
  objects: [
    // --- cube (0–80) ---
    spike(14),
    ...spikes(24, 0, 2),
    spike(36),
    block(44, 0, 3, 1), spike(48),
    ...spikes(58, 0, 3),
    spike(72),

    // --- tunnel one (85–165): widest, a long straight carries the checkpoint ---
    portal(86, 'triangle', 0, 1, 4),
    tunnel(85, 15, 1, 5),
    tunnel(100, 10, 2, 6),
    tspike(105, 'floor'),
    tunnel(110, 10, 1, 5),
    tspike(115, 'ceil'),
    tunnel(120, 20, 2, 6),
    checkpoint(134),
    tunnel(140, 10, 1, 5),
    tspike(145, 'floor'),
    tunnel(150, 15, 2, 6),
    portal(158, 'cube', 2, 1, 4),

    // --- cube (170–245) ---
    ...spikes(176, 0, 2),
    spike(188),
    ...spikes(198, 0, 3),
    spike(212),
    block(220, 0, 4, 1), ...spikes(224, 0, 2), block(226, 1, 4, 1),
    ...spikes(238, 0, 2),

    // --- ship one (250–320): 5 rows ---
    portal(250, 'ship'),
    ceiling(254, 66, 5),
    block(262, 0, 1, 2),
    spikeDown(272, 4),
    block(282, 3, 2, 2),
    checkpoint(294),
    spike(302),
    portal(314, 'cube', 0, 1, 5),

    // --- cube (325–400) ---
    ...spikes(330, 0, 2),
    spike(342),
    pad(350),
    block(353, 1, 2, 1), ...spikes(355, 0, 2), block(357, 2, 2, 1),
    ...spikes(368, 0, 3),
    spike(382),
    ...spikes(392, 0, 2),

    // --- tunnel two (405–490): width 4 ---
    portal(406, 'triangle', 0, 1, 4),
    tunnel(405, 15, 1, 5),
    tunnel(420, 10, 2, 6),
    tspike(425, 'floor'),
    tunnel(430, 20, 1, 5),
    checkpoint(445),
    tunnel(450, 10, 2, 6),
    tspike(455, 'ceil'),
    tunnel(460, 10, 1, 5),
    tspike(465, 'floor'),
    tunnel(470, 20, 2, 6),
    portal(480, 'cube', 2, 1, 4),

    // --- ship two (495–565): 4 rows, straight out of the tunnel ---
    portal(495, 'ship'),
    ceiling(499, 66, 4),
    block(507, 0, 1, 2),
    spikeDown(517, 3),
    block(527, 2, 2, 2),
    spike(537),
    block(547, 0, 2, 2),
    portal(559, 'cube', 0, 1, 4),

    // --- cube (570–645) ---
    ...spikes(576, 0, 2),
    spike(588),
    checkpoint(596),
    ...spikes(604, 0, 3),
    spike(618),
    ...spikes(628, 0, 2),
    spike(640),

    // --- tunnel three (650–735): width 3, the meanest of the three ---
    portal(651, 'triangle', 0, 1, 4),
    tunnel(650, 13, 1, 4),
    tunnel(663, 8, 2, 5),
    tspike(667, 'floor'),
    tunnel(671, 8, 1, 4),
    tspike(675, 'ceil'),
    tunnel(679, 8, 3, 6),
    tspike(683, 'floor'),
    tunnel(687, 8, 1, 4),
    tunnel(695, 10, 2, 5),
    tspike(700, 'ceil'),
    tunnel(705, 10, 1, 4),
    tunnel(715, 20, 2, 5),
    portal(725, 'cube', 2, 1, 4),

    // --- cube finale (740–890) ---
    ...spikes(744, 0, 2),
    spike(756),
    checkpoint(762),
    ...spikes(770, 0, 3),
    spike(784),
    block(792, 0, 4, 1), ...spikes(796, 0, 2), block(798, 1, 4, 1),
    ...spikes(810, 0, 2),
    spike(822),
    ...spikes(832, 0, 3),
    spike(846),
    ...spikes(856, 0, 2),
    spike(868),
    finish(882),
  ],
};
