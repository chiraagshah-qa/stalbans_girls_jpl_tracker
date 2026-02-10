import { filterFixturesByTeam } from '../fixturesFilter';
import type { Fixture } from '../scraper';

function fixture(overrides: Partial<Fixture> & { home: string; away: string }): Fixture {
  return {
    date: '',
    home: overrides.home,
    away: overrides.away,
    ...overrides,
  };
}

describe('filterFixturesByTeam', () => {
  it('returns all fixtures when teamFilter is ALL', () => {
    const fixtures: Fixture[] = [
      fixture({ home: 'Team A', away: 'Team B' }),
      fixture({ home: 'Team C', away: 'Team D' }),
    ];
    expect(filterFixturesByTeam(fixtures, 'ALL')).toEqual(fixtures);
    expect(filterFixturesByTeam(fixtures, '')).toEqual(fixtures);
  });

  it('returns fixtures where home or away matches teamFilter', () => {
    const fixtures: Fixture[] = [
      fixture({ home: 'St Albans', away: 'Luton' }),
      fixture({ home: 'Oxford', away: 'St Albans' }),
      fixture({ home: 'St Albans', away: 'MK Dons' }),
    ];
    const result = filterFixturesByTeam(fixtures, 'St Albans');
    expect(result).toHaveLength(3);
    expect(result.every((f) => f.home === 'St Albans' || f.away === 'St Albans')).toBe(true);
  });

  it('returns only fixtures where away matches when team never home', () => {
    const fixtures: Fixture[] = [
      fixture({ home: 'Luton', away: 'St Albans' }),
      fixture({ home: 'Oxford', away: 'MK Dons' }),
    ];
    const result = filterFixturesByTeam(fixtures, 'St Albans');
    expect(result).toHaveLength(1);
    expect(result[0].away).toBe('St Albans');
  });

  it('returns combined fixtures when team is both home and away', () => {
    const fixtures: Fixture[] = [
      fixture({ home: 'Team A', away: 'Team B' }),
      fixture({ home: 'Team B', away: 'Team A' }),
    ];
    const result = filterFixturesByTeam(fixtures, 'Team A');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no fixture involves the team', () => {
    const fixtures: Fixture[] = [
      fixture({ home: 'Team A', away: 'Team B' }),
    ];
    expect(filterFixturesByTeam(fixtures, 'Team C')).toEqual([]);
  });

  it('returns empty array when fixtures array is empty', () => {
    expect(filterFixturesByTeam([], 'ALL')).toEqual([]);
    expect(filterFixturesByTeam([], 'St Albans')).toEqual([]);
  });
});
