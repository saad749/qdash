// Level 6 — The Growl Loses Power. Season 2 opener and the **underground**
// level: most of its cube ground runs under a 3-row roof, so the full jump arc
// only just fits and ceiling spikes mark the stretches where jumping at all is
// fatal. Clutterfunk's squeeze without a mini mode. ~98 s.
//
// Rules for the roofed stretches: no platforms and no pads under a 3-row roof —
// a jump from anything but the floor, or a pad launch, hits the ceiling. The
// headroom invariant in smoke.mjs enforces the first of those.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling, pad,
} from './helpers.js';

export default {
  id: 6,
  name: 'The Growl Loses Power',
  lengthCells: 860,
  song: 'song6',
  bg: { hue: 0x996633 },
  objects: [
    // --- cube opener (0–130): open sky, teaches the level's rhythm ---
    ...spikes(16, 0, 2),
    spike(28),
    block(38, 0, 2, 1), spike(42),
    ...spikes(52, 0, 2),
    spike(63), block(64, 0, 3, 1),
    ...spikes(76, 0, 2),
    spike(88),
    block(98, 0, 1, 1),
    ...spikes(108, 0, 2),
    spike(120),
    checkpoint(129),

    // --- the lair (134–252): wide triangle corridor, two 2-cell shifts ---
    portal(135, 'triangle', 0, 1, 4),
    tunnel(134, 14, 1, 5),
    tunnel(148, 10, 2, 6),
    tspike(153, 'floor'),
    tunnel(158, 10, 1, 5),
    tspike(163, 'ceil'),
    tunnel(168, 10, 3, 7),
    tspike(173, 'floor'),
    tunnel(178, 10, 1, 5),
    tunnel(188, 12, 2, 6),
    tspike(194, 'ceil'),
    tunnel(200, 12, 1, 5),
    tspike(206, 'floor'),
    tunnel(212, 14, 2, 6),
    tunnel(226, 26, 1, 5),
    portal(246, 'cube', 1, 1, 4),

    // --- underground one (258–398): roof at row 3. Floor spikes say jump,
    // ceiling spikes say stay down — the whole section is that alternation. ---
    ceiling(258, 140, 3),
    ...spikes(266, 0, 2),
    spikeDown(276, 2),
    checkpoint(284),
    ...spikes(288, 0, 2),
    spikeDown(298, 2),
    spike(306),
    spikeDown(314, 2),
    ...spikes(322, 0, 3),
    spikeDown(334, 2),
    spike(342),
    spikeDown(350, 2),
    ...spikes(358, 0, 2),
    spikeDown(368, 2),
    spike(376),
    spikeDown(384, 2),
    spike(392),

    // --- ship corridor (404–518): 5 rows, roof and floor both lethal now ---
    portal(404, 'ship'),
    ceiling(408, 110, 5),
    block(420, 0, 1, 2),
    checkpoint(430),
    spikeDown(432, 4),
    block(444, 3, 2, 2),
    spike(456),
    spikeDown(468, 4),
    block(480, 0, 1, 2),
    block(492, 3, 2, 2),
    spike(504),
    portal(516, 'cube', 0, 1, 5),      // full corridor height so the ship can't fly past

    // --- underground two (530–680): same idea, tighter spacing ---
    ceiling(530, 150, 3),
    ...spikes(536, 0, 2),
    spikeDown(546, 2),
    spike(554),
    spikeDown(562, 2),
    ...spikes(570, 0, 2),
    checkpoint(576),
    ...spikes(584, 0, 3),
    spikeDown(596, 2),
    spike(604),
    spikeDown(612, 2),
    ...spikes(620, 0, 2),
    spikeDown(630, 2),
    spike(638),
    spikeDown(646, 2),
    ...spikes(654, 0, 2),
    spikeDown(664, 2),
    spike(672),

    // --- back into open sky (686–740) ---
    ...spikes(690, 0, 2),
    spike(702),
    ...spikes(712, 0, 2),
    spike(722),
    checkpoint(731),

    // --- finale (740–860): the pad climb needs headroom, so no roof here ---
    ...spikes(742, 0, 2),
    spike(754),
    pad(762),
    block(765, 1, 2, 1), ...spikes(767, 0, 2), block(769, 2, 2, 1),
    ...spikes(780, 0, 3),
    spike(792),
    ...spikes(802, 0, 2),
    spike(814),
    ...spikes(824, 0, 2),
    spike(836),
    finish(852),
  ],
};
