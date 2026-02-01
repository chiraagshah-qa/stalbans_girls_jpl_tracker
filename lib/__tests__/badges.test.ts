import {
  shortenTeamName,
  getDisplayTeamName,
  getTeamInitials,
  getBadgeSource,
} from '../badges';

describe('shortenTeamName', () => {
  it('returns empty string for empty input', () => {
    expect(shortenTeamName('')).toBe('');
    expect(shortenTeamName('   ')).toBe('');
  });

  it('strips U14, U16, Girls', () => {
    expect(shortenTeamName('St Albans U14 Girls')).toBe('St Albans');
  });

  it('keeps club - team when both parts present', () => {
    expect(shortenTeamName('St Albans - Academy U14')).toBe('St Albans - Academy');
  });
});

describe('getDisplayTeamName', () => {
  it('returns empty string for null or undefined', () => {
    expect(getDisplayTeamName(null)).toBe('');
    expect(getDisplayTeamName(undefined)).toBe('');
  });

  it('uses display patterns for known teams', () => {
    expect(getDisplayTeamName('Capital Girls FC')).toBe('Capital Girls');
  });

  it('falls back to shortenTeamName for unknown names', () => {
    expect(getDisplayTeamName('St Albans City U14')).toBe('St Albans City');
  });
});

describe('getTeamInitials', () => {
  it('returns ? for null or empty', () => {
    expect(getTeamInitials(null)).toBe('?');
    expect(getTeamInitials('')).toBe('?');
  });

  it('returns first letters of first two words', () => {
    expect(getTeamInitials('St Albans')).toBe('SA');
    expect(getTeamInitials('Luton Town')).toBe('LT');
  });

  it('returns first two chars for single word', () => {
    expect(getTeamInitials('Stevenage')).toBe('ST');
  });
});

describe('getBadgeSource', () => {
  it('returns null for null or undefined', () => {
    expect(getBadgeSource(null)).toBeNull();
    expect(getBadgeSource(undefined)).toBeNull();
  });

  it('returns null for empty or whitespace string', () => {
    expect(getBadgeSource('')).toBeNull();
    expect(getBadgeSource('   ')).toBeNull();
  });

  it('returns source when team name matches TEAM_CREST_SOURCES key', () => {
    const source = getBadgeSource('Oxford City FC U14 Girls');
    expect(source).not.toBeNull();
    expect(typeof source).toBe('object');
  });

  it('returns source when team name includes LOCAL_BADGES key', () => {
    const source = getBadgeSource('St Albans City U14');
    expect(source).not.toBeNull();
  });

  it('returns null for unknown team name', () => {
    expect(getBadgeSource('Unknown FC 123')).toBeNull();
  });
});
