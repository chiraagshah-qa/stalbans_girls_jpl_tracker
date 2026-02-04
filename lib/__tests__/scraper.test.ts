import {
  getGroupIdForTeam,
  parseFixtureDate,
  formatTimeForDisplay,
  getStAlbansTeamInDivision,
  getSchedulePageUrl,
  getGroupScheduleDateAllUrl,
  parseLeagueName,
  parseFixtures,
  DEFAULT_GROUP_ID,
  GROUP_ID_U16,
  TEAM_ID_U14,
  type Standing,
  type Fixture,
} from '../scraper';

const GOTSPORT_BASE = 'https://system.gotsport.com';
const DEFAULT_EVENT_ID = '46915';

describe('getGroupIdForTeam', () => {
  it('returns U16 group id when team name includes U16', () => {
    expect(getGroupIdForTeam('U16')).toBe(GROUP_ID_U16);
    expect(getGroupIdForTeam('St Albans U16')).toBe(GROUP_ID_U16);
  });

  it('returns default group id for U14 or null', () => {
    expect(getGroupIdForTeam('U14')).toBe(DEFAULT_GROUP_ID);
    expect(getGroupIdForTeam(null)).toBe(DEFAULT_GROUP_ID);
    expect(getGroupIdForTeam('St Albans U14')).toBe(DEFAULT_GROUP_ID);
  });
});

describe('parseFixtureDate', () => {
  it('returns NaN for missing or TBD date', () => {
    expect(parseFixtureDate({})).toBeNaN();
    expect(parseFixtureDate({ date: '' })).toBeNaN();
    expect(parseFixtureDate({ date: 'TBD' })).toBeNaN();
  });

  it('parses date string to timestamp', () => {
    const ts = parseFixtureDate({ date: 'Jan 15, 2026' });
    expect(Number.isFinite(ts)).toBe(true);
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('handles date with comma variation', () => {
    const ts = parseFixtureDate({ date: 'December 31, 2025' });
    expect(Number.isFinite(ts)).toBe(true);
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(31);
  });
});

describe('formatTimeForDisplay', () => {
  it('returns en dash for empty or undefined', () => {
    expect(formatTimeForDisplay(undefined)).toBe('–');
    expect(formatTimeForDisplay('')).toBe('–');
    expect(formatTimeForDisplay('   ')).toBe('–');
  });

  it('strips timezone suffix', () => {
    expect(formatTimeForDisplay('2:00 PM GMT')).toBe('2:00 PM');
    expect(formatTimeForDisplay('14:00 BST')).toBe('14:00');
  });

  it('returns trimmed time (may strip AM/PM if treated as timezone)', () => {
    expect(formatTimeForDisplay('2:30 PM')).toBe('2:30');
    expect(formatTimeForDisplay('14:00')).toBe('14:00');
  });
});

describe('getStAlbansTeamInDivision', () => {
  const standings: Standing[] = [
    { name: 'St Albans City FC Academy Girls U14 Girls', rank: 1, MP: 0, W: 0, L: 0, D: 0, GF: 0, GA: 0, GD: 0, PTS: 0 },
    { name: 'Other Club U14', rank: 2, MP: 0, W: 0, L: 0, D: 0, GF: 0, GA: 0, GD: 0, PTS: 0 },
  ];

  it('returns null for empty standings or no division', () => {
    expect(getStAlbansTeamInDivision([], 'U14')).toBeNull();
    expect(getStAlbansTeamInDivision(standings, '')).toBeNull();
  });

  it('returns St Albans team name matching division', () => {
    expect(getStAlbansTeamInDivision(standings, 'U14')).toBe('St Albans City FC Academy Girls U14 Girls');
  });

  it('returns null when no St Albans in division', () => {
    expect(getStAlbansTeamInDivision(standings, 'U16')).toBeNull();
  });
});

describe('getSchedulePageUrl', () => {
  it('returns team schedule URL for default group with teamId', () => {
    const url = getSchedulePageUrl(DEFAULT_EVENT_ID, DEFAULT_GROUP_ID, TEAM_ID_U14);
    expect(url).toBe(`${ GOTSPORT_BASE }/org_event/events/${ DEFAULT_EVENT_ID }/schedules?team=${ TEAM_ID_U14 }`);
  });

  it('returns team schedule URL for default group without teamId', () => {
    const url = getSchedulePageUrl(DEFAULT_EVENT_ID, DEFAULT_GROUP_ID);
    expect(url).toContain('schedules?team=');
    expect(url).toContain(GOTSPORT_BASE);
  });

  it('returns group schedule URL for non-default group', () => {
    const url = getSchedulePageUrl(DEFAULT_EVENT_ID, GROUP_ID_U16);
    expect(url).toBe(`${ GOTSPORT_BASE }/org_event/events/${ DEFAULT_EVENT_ID }/schedules?group=${ GROUP_ID_U16 }`);
  });
});

describe('getGroupScheduleDateAllUrl', () => {
  it('returns schedule date=All URL for event and group', () => {
    const url = getGroupScheduleDateAllUrl(DEFAULT_EVENT_ID, DEFAULT_GROUP_ID);
    expect(url).toBe(`${ GOTSPORT_BASE }/org_event/events/${ DEFAULT_EVENT_ID }/schedules?date=All&group=${ DEFAULT_GROUP_ID }`);
  });

  it('uses default event and group when not provided', () => {
    const url = getGroupScheduleDateAllUrl();
    expect(url).toContain('date=All');
    expect(url).toContain(`group=${ DEFAULT_GROUP_ID }`);
  });
});

describe('parseLeagueName', () => {
  it('returns empty string when no .lead element', () => {
    expect(parseLeagueName('<html><body></body></html>')).toBe('');
    expect(parseLeagueName('<div class="other">Female U14</div>')).toBe('');
  });

  it('returns trimmed text from .lead element', () => {
    expect(parseLeagueName('<div class="lead">Female U14 - Orange</div>')).toBe('Female U14 - Orange');
    expect(parseLeagueName('<div class="lead">  Female   U14  </div>')).toBe('Female U14');
  });
});

describe('parseFixtures status fallback', () => {
  it('sets status from time cell text when there is no .label element', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <th>Time</th>
              <th>Home</th>
              <th>Away</th>
              <th>Result</th>
            </tr>
            <tr>
              <td>Jan 31, 2026 10:00 AM Rained out</td>
              <td>St Albans City FC Academy Girls U14 Girls</td>
              <td>Other FC</td>
              <td></td>
            </tr>
          </table>
        </body>
      </html>
    `;
    const fixtures: Fixture[] = parseFixtures(html);
    expect(fixtures).toHaveLength(1);
    const f = fixtures[0];
    expect(f.home).toBe('St Albans City FC Academy Girls U14 Girls');
    expect(f.away).toBe('Other FC');
    // Date and time are parsed directly from the time cell
    expect(f.date).toBe('Jan 31, 2026');
    expect(f.time).toMatch(/^10:00 AM/);
    expect(f.status).toBe('Rained out');
    expect(f.score).toBeUndefined();
    expect(f.played).toBeUndefined();
  });

  it('detects cancelled / postponed / abandoned from time cell text', () => {
    const html = `
      <html>
        <body>
          <table>
            <tr>
              <th>Time</th>
              <th>Home</th>
              <th>Away</th>
            </tr>
            <tr>
              <td>Feb 1, 2026 12:00 PM Cancelled</td>
              <td>Team A</td>
              <td>Team B</td>
            </tr>
            <tr>
              <td>Feb 2, 2026 13:00 PM Postponed</td>
              <td>Team C</td>
              <td>Team D</td>
            </tr>
            <tr>
              <td>Feb 3, 2026 14:00 PM Abandoned</td>
              <td>Team E</td>
              <td>Team F</td>
            </tr>
          </table>
        </body>
      </html>
    `;
    const fixtures: Fixture[] = parseFixtures(html);
    expect(fixtures).toHaveLength(3);
    expect(fixtures[0].status).toBe('Cancelled');
    expect(fixtures[1].status).toBe('Postponed');
    expect(fixtures[2].status).toBe('Abandoned');
  });
});
