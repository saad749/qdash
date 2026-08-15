// Level 9 — A Hero Arises. The **jump-heavy** level: pad ascents and stair
// chains almost end to end, with the ship cut to a single short interruption and
// one tunnel. Jumper's profile — the demand is consistency across back-to-back
// segments rather than any one hard obstacle. ~110 s.
//
// Platform chains climb +1 per step with 1–2 cell gaps; the cube's arc is ~4
// cells, so every gap is a jump you must not skip. Hazards sit below the chains,
// so falling off is what costs the run.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling, pad, stairs,
} from './helpers.js';

export default {
  id: 9,
  name: 'A Hero Arises',
  lengthCells: 960,
  song: 'song9',
  bg: { hue: 0xddaa33 },
  objects: [
    // --- first steps (0–130) ---
    spike(16),
    ...spikes(26, 0, 2),
    block(36, 0, 2, 1), spike(40),
    ...spikes(50, 0, 2),
    ...stairs(60, 4, 3),
    ...spikes(80, 0, 2),
    spike(92),
    block(100, 0, 1, 1),
    ...spikes(108, 0, 3),
    spike(122),

    // --- the ascent (135–250): three pad climbs, each higher ---
    checkpoint(144),
    pad(150),
    block(153, 1, 2, 1), ...spikes(155, 0, 2), block(157, 2, 2, 1),
    ...spikes(168, 0, 2),
    pad(178),
    block(181, 1, 3, 1), block(185, 2, 3, 1), block(189, 3, 3, 1),
    ...spikes(202, 0, 3),
    spike(216),
    pad(224),
    block(227, 1, 2, 1), ...spikes(229, 0, 2), block(231, 2, 2, 1),
    ...spikes(242, 0, 2),

    // --- ground rhythm (255–310) ---
    ...spikes(258, 0, 3),
    spike(272),
    ...spikes(282, 0, 2),
    spike(294),
    checkpoint(306),

    // --- tunnel (315–430): the level's only flip section ---
    portal(316, 'triangle', 0, 1, 4),
    tunnel(315, 15, 1, 5),
    tunnel(330, 10, 2, 6),
    tspike(335, 'floor'),
    tunnel(340, 10, 1, 5),
    tspike(345, 'ceil'),
    tunnel(350, 10, 3, 7),
    tspike(355, 'floor'),
    tunnel(360, 10, 1, 5),
    tunnel(370, 12, 2, 6),
    tspike(376, 'ceil'),
    tunnel(382, 12, 1, 5),
    tspike(388, 'floor'),
    tunnel(394, 12, 2, 6),
    tunnel(406, 24, 1, 5),
    portal(422, 'cube', 1, 1, 4),

    // --- short flight (438–500): the one interruption ---
    portal(438, 'ship'),
    ceiling(442, 58, 5),
    block(452, 0, 1, 2),
    spikeDown(462, 4),
    block(472, 3, 2, 2),
    spike(482),
    portal(494, 'cube', 0, 1, 5),

    // --- back on the ground, climbing again (505–700) ---
    checkpoint(508),
    ...spikes(516, 0, 2),
    spike(528),
    ...stairs(538, 4, 3),
    ...spikes(558, 0, 3),
    spike(572),
    pad(580),
    block(583, 1, 2, 1), ...spikes(585, 0, 2), block(587, 2, 2, 1),
    ...spikes(598, 0, 2),
    spike(610),
    block(618, 0, 4, 1), ...spikes(622, 0, 2), block(624, 1, 4, 1),
    ...spikes(636, 0, 3),
    checkpoint(650),
    pad(658),
    block(661, 1, 3, 1), block(665, 2, 3, 1), block(669, 3, 3, 1),
    ...spikes(682, 0, 2),
    spike(694),

    // --- the hero's ascent (705–960): the longest chain in the game ---
    ...spikes(710, 0, 3),
    spike(724),
    pad(732),
    block(735, 1, 3, 1), block(739, 2, 3, 1), block(743, 3, 3, 1),
    ...spikes(756, 0, 2),
    spike(768),
    ...spikes(778, 0, 3),
    spike(792),
    checkpoint(816),
    ...stairs(800, 4, 3),
    ...spikes(822, 0, 2),
    spike(834),
    pad(842),
    block(845, 1, 2, 1), ...spikes(847, 0, 2), block(849, 2, 2, 1),
    ...spikes(860, 0, 3),
    spike(874),
    ...spikes(884, 0, 2),
    spike(896),
    ...spikes(906, 0, 3),
    spike(920),
    finish(946),
  ],
};
