import type { Fixture } from './scraper';

/** Fixtures where our team played opponent (played = has score), sorted by date */
export function getPlayedFixturesVs (
  fixtures: Fixture[],
  ourTeamName: string,
  opponentName: string
): Fixture[] {
  const our = ourTeamName.toLowerCase();
  const opp = opponentName.toLowerCase();
  const played = fixtures.filter((f) => {
    if (!f.score && !f.played) return false;
    const h = (f.home || '').toLowerCase();
    const a = (f.away || '').toLowerCase();
    const hasUs = h.includes('st albans') || a.includes('st albans') || h.includes(our) || a.includes(our);
    const hasThem = h.includes(opp) || a.includes(opp);
    return hasUs && hasThem;
  });
  played.sort((a, b) => {
    const ta = a.date ? new Date(a.date.replace(/\s*,?\s*/, ' ').trim()).getTime() : 0;
    const tb = b.date ? new Date(b.date.replace(/\s*,?\s*/, ' ').trim()).getTime() : 0;
    return ta - tb;
  });
  return played;
}

/** Whether our team was the home side in this fixture (fixture.home is our team) */
export function isOurTeamHome (fixture: Fixture, ourTeamName: string): boolean {
  const home = (fixture.home || '').trim().toLowerCase();
  if (!home) return false;
  const our = ourTeamName.trim().toLowerCase();
  return home.includes('st albans') || (!!our && home.includes(our));
}

/**
 * Get Home and Away scores from fixtures only.
 * fixture.score is "homeGoals - awayGoals" and fixture.home/away identify who was home/away,
 * so we put each score in the correct column.
 */
export function getHomeAwayScoresFromFixtures (
  fixtures: Fixture[],
  ourTeamName: string,
  opponentName: string
): { homeScore: string; awayScore: string } {
  const played = getPlayedFixturesVs(fixtures, ourTeamName, opponentName);
  const homeScores: string[] = [];
  const awayScores: string[] = [];
  for (const f of played) {
    const scoreStr = (f.score || '').trim();
    if (!scoreStr) continue;
    if (isOurTeamHome(f, ourTeamName)) {
      homeScores.push(scoreStr);
    } else {
      awayScores.push(scoreStr);
    }
  }
  return {
    homeScore: homeScores.length > 0 ? homeScores.join(', ') : '–',
    awayScore: awayScores.length > 0 ? awayScores.join(', ') : '–',
  };
}
