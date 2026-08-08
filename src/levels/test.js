// Dev sandbox (?level=test): one strip with every motif for physics tuning.

import {
  block, spike, spikes, spikeDown, portal, checkpoint,
  tunnel, tspike, finish, ceiling, stairs, pad,
} from './helpers.js';

export default {
  id: 'test',
  name: 'Tuning Sandbox',
  lengthCells: 320,
  song: 'song1',
  bg: { hue: 0x336655 },
  objects: [
    // spikes: single / double / triple
    spike(12),
    ...spikes(20, 0, 2),
    ...spikes(30, 0, 3),
    checkpoint(40),
    // steps and walls
    block(46, 0, 2, 1),
    ...stairs(54, 3, 2),
    block(66, 0, 1, 1),
    checkpoint(74),
    // floating platform chain
    block(80, 0, 4, 1), ...spikes(84, 0, 2), block(86, 1, 4, 1),
    // launch pad onto a 2-cell-high platform
    pad(92), block(95, 1, 2, 1),
    // ship corridor
    portal(98, 'ship'),
    ceiling(100, 40, 5),
    block(112, 0, 1, 2),
    spikeDown(122, 4),
    block(130, 3, 2, 2),
    portal(138, 'cube', 0, 1, 5),      // full corridor height
    checkpoint(146),
    // tunnel zig-zag with every transition type
    portal(153, 'triangle', 0, 1, 4),
    tunnel(152, 12, 1, 5),
    tunnel(164, 10, 2, 6),      // +1 free
    tspike(170, 'floor'),
    tunnel(174, 10, 4, 8),      // +2: must ride ceiling
    tspike(179, 'ceil'),
    tunnel(184, 10, 2, 6),      // -2: must ride floor
    tunnel(194, 16, 1, 5),      // -1 free
    tspike(200, 'floor'),
    portal(206, 'cube', 1, 1, 4),
    checkpoint(216),
    // rhythm taps to feel the jump arc
    spike(224), spike(232), spike(240), spike(248),
    checkpoint(258),
    ...spikes(266, 0, 2),
    finish(300),
  ],
};
