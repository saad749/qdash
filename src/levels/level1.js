// Level 1 — Stereo Madness. Gentle intro: single spikes, 1-cell steps, one easy
// ship corridor, one gentle triangle tunnel. ~69 s.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling,
} from './helpers.js';

export default {
  id: 1,
  name: 'Stereo Madness',
  lengthCells: 600,
  song: 'song1',
  bg: { hue: 0x2244aa },
  objects: [
    // --- cube intro (0–206): single spikes and baby steps ---
    spike(20),
    spike(32),
    block(44, 0, 2, 1), spike(48),
    spike(58),
    spike(67), block(68, 0, 3, 1),
    spike(80),
    checkpoint(90),
    spike(100),
    spike(108),
    block(116, 0, 4, 1), ...spikes(120, 0, 2), block(122, 1, 4, 1),
    spike(134),
    block(142, 0, 1, 1),
    spike(150),
    spike(160),
    spike(170),
    ...spikes(180, 0, 2),
    spike(190),
    checkpoint(198),

    // --- ship section (206–294): tall corridor, sparse obstacles ---
    portal(204, 'ship'),
    ceiling(208, 86, 6),
    block(222, 0, 1, 2),
    spikeDown(234, 5),
    block(246, 4, 2, 2),
    spike(258),
    spikeDown(270, 5),
    block(280, 0, 1, 2),
    portal(292, 'cube', 0, 1, 6),      // full corridor height so the ship can't fly over it
    checkpoint(300),

    // --- cube midsection (296–406) ---
    spike(310),
    spike(318),
    spike(325), block(326, 0, 3, 1),
    ...spikes(338, 0, 2),
    block(348, 0, 4, 1), ...spikes(352, 0, 2), block(354, 1, 4, 1),
    ...spikes(368, 0, 2),
    spike(378),
    spike(386),
    checkpoint(400),

    // --- triangle tunnel (404–498): wide corridor, gentle zigs ---
    portal(405, 'triangle', 0, 1, 4),
    tunnel(404, 16, 1, 5),
    tunnel(420, 12, 2, 6),
    tunnel(432, 14, 1, 5),
    tspike(440, 'floor'),
    tunnel(446, 12, 2, 6),
    tspike(452, 'ceil'),
    tunnel(458, 40, 1, 5),
    tspike(478, 'floor'),
    portal(494, 'cube', 1, 1, 4),
    checkpoint(510),

    // --- final cube run (500–600) ---
    spike(520),
    spike(528),
    spike(535), block(536, 0, 3, 1),
    ...spikes(548, 0, 2),
    block(558, 0, 1, 1),
    spike(564),
    ...spikes(574, 0, 2),
    spike(584),
    finish(596),
  ],
};
