// Level 3 — Campin Outside (Polargeist-inspired). Elevated platform chains,
// an early demanding tunnel, a tighter ship corridor. ~82 s.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling, stairs, pad,
} from './helpers.js';

export default {
  id: 3,
  name: 'Campin Outside',
  lengthCells: 720,
  song: 'song3',
  bg: { hue: 0x7744cc },
  objects: [
    // --- cube opener (0–142) ---
    spike(16),
    ...spikes(26, 0, 2),
    spike(37), block(38, 0, 2, 1),
    ...spikes(48, 0, 2),
    pad(55),                            // launch onto the elevated chain
    block(58, 1, 3, 1), ...spikes(59, 0, 6), block(63, 2, 3, 1),
    ...spikes(76, 0, 2),
    block(86, 0, 1, 1),
    spike(90),
    ...spikes(100, 0, 2),
    checkpoint(108),
    spike(116),
    ...spikes(124, 0, 2),
    spike(134),

    // --- triangle tunnel (144–246): early and busy ---
    portal(145, 'triangle', 0, 1, 4),
    tunnel(144, 14, 1, 5),
    tunnel(158, 10, 2, 6),
    tspike(164, 'floor'),
    tunnel(168, 10, 4, 8),
    tspike(173, 'ceil'),
    tunnel(178, 10, 2, 6),
    tunnel(188, 10, 1, 5),
    tspike(193, 'floor'),
    tunnel(198, 10, 2, 6),
    tspike(204, 'ceil'),
    tunnel(208, 12, 1, 5),
    tspike(214, 'floor'),
    tunnel(220, 26, 1, 5),
    tspike(228, 'ceil'),
    checkpoint(238),
    portal(244, 'cube', 1, 1, 4),

    // --- cube platform chains (252–392) ---
    ...spikes(258, 0, 2),
    block(268, 0, 4, 1), ...spikes(272, 0, 2), block(274, 1, 4, 1),
    ...spikes(278, 0, 2), block(280, 2, 4, 1),
    ...spikes(294, 0, 2),
    block(304, 0, 1, 1),
    spike(308),
    ...spikes(316, 0, 2),
    pad(323),
    block(326, 1, 2, 1), ...spikes(328, 0, 2), block(330, 2, 2, 1),
    ...spikes(332, 0, 2), block(334, 1, 2, 1),
    ...spikes(344, 0, 2),
    checkpoint(360),
    ...spikes(370, 0, 2),
    spike(380),
    spike(386),

    // --- ship corridor (394–484): pillars and stalactites ---
    portal(394, 'ship'),
    ceiling(396, 88, 5),
    block(408, 0, 1, 3),
    spikeDown(420, 4),
    block(432, 3, 2, 2),
    spike(444),
    block(452, 0, 1, 3),
    spikeDown(464, 4),
    checkpoint(480),
    portal(484, 'cube', 0, 1, 5),      // full corridor height

    // --- long cube closer (486–720) ---
    ...spikes(494, 0, 2),
    spike(503), block(504, 0, 3, 1),
    ...spikes(514, 0, 2),
    spike(524),
    spike(530),
    // 5-wide steps. The binding constraint here is not the spike but the
    // step-up: landing on step one around cell 542, the cube must be airborne
    // before step two's face or it dies on the wall. On 3- and 4-wide steps that
    // left ~6 frames, which only a late jump clears and the autoplayer never
    // jumps late. 5-wide gives ~13. The spike sits two cells in from the top
    // step's far edge so the 15-frame jump window is entered early, not late.
    ...stairs(540, 5, 2), spike(548, 2),
    ...spikes(556, 0, 2),
    pad(563),
    block(566, 1, 3, 1), ...spikes(565, 0, 3),
    ...spikes(578, 0, 2),
    spike(588),
    ...spikes(596, 0, 2),
    checkpoint(612),
    ...spikes(624, 0, 2),
    block(634, 0, 1, 1),
    spike(638),
    ...spikes(648, 0, 2),
    spike(658),
    ...spikes(666, 0, 2),
    spike(676),
    ...spikes(684, 0, 2),
    spike(694),
    finish(714),
  ],
};
