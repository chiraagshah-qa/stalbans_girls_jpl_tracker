import type { Fixture } from './scraper';

/**
 * Filter fixtures to those involving the given team.
 * When teamFilter is 'ALL', returns all fixtures; otherwise only fixtures where
 * home or away matches the team name exactly.
 */
export function filterFixturesByTeam(
  fixtures: Fixture[],
  teamFilter: string
): Fixture[] {
  if (!teamFilter || teamFilter === 'ALL') return fixtures;
  return fixtures.filter(
    (f) => f.home === teamFilter || f.away === teamFilter
  );
}
