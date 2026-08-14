// Season grouping for levels. Level ids are global and sequential across seasons
// so saved records — which are keyed by level id — survive every new release.

export const SEASONS = [
  {
    id: 1,
    name: 'The Tumble Wvrumbles',
    status: 'released',
    releasedOn: '2026-08-08',
    levelIds: [1, 2, 3, 4, 5],
  },
  {
    id: 2,
    name: 'The Dark Awakens',
    status: 'released',
    releasedOn: '2026-08-14',
    levelIds: [6, 7, 8, 9, 10],
  },
  {
    id: 3,
    name: '???',
    status: 'coming-soon',
    releasedOn: null,
    levelIds: [],
  },
];

export const RELEASED_SEASONS = SEASONS.filter(s => s.status === 'released');

export const seasonById = (id) => SEASONS.find(s => s.id === id) || null;

export const seasonOf = (levelId) => SEASONS.find(s => s.levelIds.includes(levelId)) || null;

// Next level within the same season: a season finale ends the run instead of
// spilling into the next season's opener.
export function nextLevelId(levelId) {
  const season = seasonOf(levelId);
  if (!season) return null;
  const i = season.levelIds.indexOf(levelId);
  return season.levelIds[i + 1] ?? null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Release tag text, e.g. 'RELEASED 8 Aug 2026'. Parsed by hand rather than via
// Date so the label never shifts a day in a west-of-UTC timezone.
export function releaseLabel(season) {
  if (season.status !== 'released' || !season.releasedOn) return 'COMING SOON';
  const [y, m, d] = season.releasedOn.split('-').map(Number);
  return `RELEASED ${d} ${MONTHS[m - 1]} ${y}`;
}
