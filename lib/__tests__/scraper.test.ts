import {
  getGroupIdForTeam,
  parseFixtureDate,
  formatTimeForDisplay,
  getStAlbansTeamInDivision,
  getSchedulePageUrl,
  getGroupScheduleDateAllUrl,
  DEFAULT_GROUP_ID,
  GROUP_ID_U16,
  TEAM_ID_U14,
  type Standing,
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
