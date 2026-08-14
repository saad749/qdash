// Level 6 — The Growl Loses Power. Season 2 opener: the beast is fading, so the
// level starts at roughly level 4's tier rather than picking up level 5's. One
// long lair tunnel, one open ship corridor, crumbling step chains. ~98 s.

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
    // --- cube opener (0–130): the growl still has teeth, but slow ---
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

    // --- cube midsection (255–400): the first triple, then a pad climb ---
    ...spikes(262, 0, 2),
    spike(272),
    checkpoint(284),
    ...spikes(292, 0, 3),
    block(304, 0, 4, 1), ...spikes(308, 0, 2), block(310, 1, 4, 1),
    ...spikes(322, 0, 2),
    spike(332),
    pad(340),
    block(343, 1, 2, 1), ...spikes(345, 0, 2), block(347, 2, 2, 1),
    ...spikes(358, 0, 2),
    spike(368),
    block(378, 0, 1, 1),
    ...spikes(388, 0, 2),

    // --- ship corridor (404–518): 5 rows, sparse — room to breathe ---
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

    // --- cube run (525–740) ---
    ...spikes(530, 0, 2),
    ...spikes(542, 0, 3),
    block(554, 0, 1, 1),
    spike(560),
    ...spikes(568, 0, 2),
    checkpoint(576),
    ...spikes(584, 0, 3),
    spike(596),
    block(604, 0, 4, 1), ...spikes(608, 0, 2), block(610, 1, 4, 1),
    ...spikes(622, 0, 2),
    spike(634),
    ...spikes(644, 0, 3),
    block(656, 0, 2, 1),
    spike(662),
    ...spikes(672, 0, 2),
    spike(684),
    ...spikes(694, 0, 3),
    spike(706),
    block(714, 0, 1, 1),
    ...spikes(722, 0, 2),
    checkpoint(731),

    // --- finale (740–860): one last climb while the growl gives out ---
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
