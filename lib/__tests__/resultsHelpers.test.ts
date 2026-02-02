import {
  getPlayedFixturesVs,
  isOurTeamHome,
  getHomeAwayScoresFromFixtures,
} from '../resultsHelpers';
import type { Fixture } from '../scraper';

const ourTeam = 'St Albans City FC Academy Girls U14 Girls';

function fixture (overrides: Partial<Fixture> & { home: string; away: string }): Fixture {
  return {
    date: 'Jan 15, 2026',
    home: overrides.home,
    away: overrides.away,
    ...overrides,
  };
}

describe('isOurTeamHome', () => {
  it('returns true when our team is fixture.home', () => {
    expect(isOurTeamHome(fixture({ home: ourTeam, away: 'Opponent FC' }), ourTeam)).toBe(true);
    expect(isOurTeamHome(fixture({ home: 'St Albans City U14', away: 'Other' }), ourTeam)).toBe(true);
    expect(isOurTeamHome(fixture({ home: 'St Albans', away: 'Other' }), ourTeam)).toBe(true);
  });

  it('returns false when our team is fixture.away', () => {
    expect(isOurTeamHome(fixture({ home: 'Opponent FC', away: ourTeam }), ourTeam)).toBe(false);
    expect(isOurTeamHome(fixture({ home: 'Other', away: 'St Albans U14' }), ourTeam)).toBe(false);
  });

  it('returns false for empty fixture.home', () => {
    expect(isOurTeamHome(fixture({ home: '', away: ourTeam }), ourTeam)).toBe(false);
  });
});

describe('getPlayedFixturesVs', () => {
  it('returns only fixtures that have our team and opponent and a score or played', () => {
    const fixtures: Fixture[] = [
      fixture({ home: ourTeam, away: 'Luton Town U14', score: '2 - 1' }),
      fixture({ home: ourTeam, away: 'Other FC' }),
      fixture({ home: 'Luton Town U14', away: ourTeam, score: '1 - 3' }),
      fixture({ home: 'Third Team', away: 'Luton Town U14', score: '0 - 0' }),
      fixture({ home: ourTeam, away: 'Luton Town U14', played: true, score: '' }),
    ];
    const played = getPlayedFixturesVs(fixtures, ourTeam, 'Luton Town U14');
    expect(played).toHaveLength(3);
    const hasUsAndThem = (f: Fixture) =>
      (f.home.toLowerCase().includes('st albans') || f.away.toLowerCase().includes('st albans')) &&
      (f.home.toLowerCase().includes('luton') || f.away.toLowerCase().includes('luton'));
    expect(played.every(hasUsAndThem)).toBe(true);
  });

  it('returns empty when no played fixtures vs opponent', () => {
    const fixtures: Fixture[] = [
      fixture({ home: ourTeam, away: 'Other FC', score: '1 - 0' }),
    ];
    expect(getPlayedFixturesVs(fixtures, ourTeam, 'Luton Town U14')).toEqual([]);
  });

  it('sorts by date ascending', () => {
    const fixtures: Fixture[] = [
      fixture({ date: 'Feb 1, 2026', home: ourTeam, away: 'Opp', score: '1 - 0' }),
      fixture({ date: 'Jan 10, 2026', home: 'Opp', away: ourTeam, score: '0 - 2' }),
    ];
    const played = getPlayedFixturesVs(fixtures, ourTeam, 'Opp');
    expect(played[ 0 ].date).toBe('Jan 10, 2026');
    expect(played[ 1 ].date).toBe('Feb 1, 2026');
  });
});

describe('getHomeAwayScoresFromFixtures', () => {
  it('puts score in Home when our team was home, Away when our team was away', () => {
    const fixtures: Fixture[] = [
      fixture({ date: 'Jan 10, 2026', home: ourTeam, away: 'Luton Town U14', score: '2 - 1' }),
      fixture({ date: 'Feb 1, 2026', home: 'Luton Town U14', away: ourTeam, score: '1 - 3' }),
    ];
    const { homeScore, awayScore } = getHomeAwayScoresFromFixtures(fixtures, ourTeam, 'Luton Town U14');
    expect(homeScore).toBe('2 - 1');
    expect(awayScore).toBe('1 - 3');
  });

  it('returns en dash when no played fixtures vs opponent', () => {
    const fixtures: Fixture[] = [];
    const { homeScore, awayScore } = getHomeAwayScoresFromFixtures(fixtures, ourTeam, 'Luton Town U14');
    expect(homeScore).toBe('–');
    expect(awayScore).toBe('–');
  });

  it('only one game: home score in Home column, Away column en dash', () => {
    const fixtures: Fixture[] = [
      fixture({ home: ourTeam, away: 'Oxford City U14', score: '3 - 0' }),
    ];
    const { homeScore, awayScore } = getHomeAwayScoresFromFixtures(fixtures, ourTeam, 'Oxford City U14');
    expect(homeScore).toBe('3 - 0');
    expect(awayScore).toBe('–');
  });

  it('only one game: away score in Away column, Home column en dash', () => {
    const fixtures: Fixture[] = [
      fixture({ home: 'Oxford City U14', away: ourTeam, score: '0 - 2' }),
    ];
    const { homeScore, awayScore } = getHomeAwayScoresFromFixtures(fixtures, ourTeam, 'Oxford City U14');
    expect(homeScore).toBe('–');
    expect(awayScore).toBe('0 - 2');
  });

  it('skips fixtures with empty score', () => {
    const fixtures: Fixture[] = [
      fixture({ home: ourTeam, away: 'Opp', score: '' }),
      fixture({ home: 'Opp', away: ourTeam }),
    ];
    const { homeScore, awayScore } = getHomeAwayScoresFromFixtures(fixtures, ourTeam, 'Opp');
    expect(homeScore).toBe('–');
    expect(awayScore).toBe('–');
  });

  it('joins multiple home or away scores with comma space', () => {
    const fixtures: Fixture[] = [
      fixture({ date: 'Jan 1, 2026', home: ourTeam, away: 'Opp', score: '1 - 0' }),
      fixture({ date: 'Jan 2, 2026', home: ourTeam, away: 'Opp', score: '2 - 1' }),
      fixture({ date: 'Jan 3, 2026', home: 'Opp', away: ourTeam, score: '0 - 1' }),
    ];
    const { homeScore, awayScore } = getHomeAwayScoresFromFixtures(fixtures, ourTeam, 'Opp');
    expect(homeScore).toBe('1 - 0, 2 - 1');
    expect(awayScore).toBe('0 - 1');
  });
});
