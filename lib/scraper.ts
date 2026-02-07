import { parse } from 'node-html-parser';

const GOTSPORT_BASE = 'https://system.gotsport.com';
const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function fetchHtml (url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  });
  if (!res.ok) {
    const status = res.status;
    if (status >= 500) {
      throw new Error('GotSport is temporarily unavailable. Please try again later.');
    }
    if (status === 404) {
      throw new Error('Page not found. The event or group may have changed.');
    }
    throw new Error(`GotSport returned ${ status }. Please try again.`);
  }
  const html = await res.text();
  return html;
}

const DEFAULT_EVENT_ID = '46915';
const DEFAULT_CLUB_ID = '28533';
/** Exported for tests/URL building only; do not use as defaults for resolution */
export const DEFAULT_GROUP_ID = '431414';
export const TEAM_ID_U14 = '3499548';
export const TEAM_ID_U16 = '3499547';
export const GROUP_ID_U16 = '431728';

export type ClubTeam = {
  name: string;
  teamId: string;
  division: string;
  age?: string;
};

export function getEventPageUrl (eventId: string = DEFAULT_EVENT_ID): string {
  return `${ GOTSPORT_BASE }/org_event/events/${ eventId }`;
}

export async function fetchEventPage (eventId: string = DEFAULT_EVENT_ID): Promise<string> {
  return fetchHtml(getEventPageUrl(eventId));
}

/**
 * Parse event page for division/group labels and their group IDs.
 * Finds links containing group= and uses link text to derive division name
 * (e.g. "Female U14 - Orange" → division "Orange").
 * Returns Record<divisionName, groupId> – no hardcoded defaults.
 */
export function parseEventPageGroupIds (html: string): Record<string, string> {
  const root = parse(html);
  const map: Record<string, string> = {};
  const links = root.querySelectorAll('a[href*="group="]');
  for (const a of links) {
    const href = a.getAttribute('href') ?? '';
    const match = href.match(/group=(\d+)/);
    if (!match) continue;
    const groupId = match[ 1 ];
    const label = text(a).trim();
    if (!label) continue;
    const division = label.includes(' - ') ? label.split(' - ').pop()!.trim() : label;
    map[ division ] = groupId;
  }
  return map;
}

export function getClubsPageUrl (
  eventId: string = DEFAULT_EVENT_ID,
  clubId: string = DEFAULT_CLUB_ID
): string {
  return `${ GOTSPORT_BASE }/org_event/events/${ eventId }/clubs/${ clubId }`;
}

export async function fetchClubsPage (
  eventId: string = DEFAULT_EVENT_ID,
  clubId: string = DEFAULT_CLUB_ID
): Promise<string> {
  const url = getClubsPageUrl(eventId, clubId);
  return fetchHtml(url);
}

/** Parse teams table from clubs page (Name, Gender, Age, Division, Bracket). */
export function parseClubsPage (html: string): ClubTeam[] {
  const root = parse(html);
  const teams: ClubTeam[] = [];
  const tables = root.querySelectorAll('table');
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;
    const headerCells = rows[ 0 ].querySelectorAll('th, td');
    const headers = headerCells.map((c) => text(c).toLowerCase());
    const nameCol = headers.findIndex((h) => h.includes('name'));
    const ageCol = headers.findIndex((h) => h === 'age');
    const divisionCol = headers.findIndex((h) => h.includes('division'));
    if (nameCol === -1 || divisionCol === -1) continue;
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[ r ].querySelectorAll('td');
      if (cells.length <= Math.max(nameCol, divisionCol)) continue;
      const nameCell = cells[ nameCol ];
      const link = nameCell?.querySelector?.('a[href*="team="]');
      const href = link?.getAttribute('href') ?? '';
      const teamMatch = href.match(/team=(\d+)/);
      if (!teamMatch) continue;
      const teamId = teamMatch[ 1 ];
      const name = text(link || nameCell).trim() || text(nameCell).trim();
      const division = (divisionCol >= 0 && cells[ divisionCol ] ? text(cells[ divisionCol ]).trim() : '') || '';
      const age = ageCol >= 0 && cells[ ageCol ] ? text(cells[ ageCol ]).trim() : undefined;
      teams.push({ name, teamId, division, ...(age && { age }) });
    }
    break;
  }
  return teams;
}

/** TeamId for schedule is the selected team ID (from the clubs schedule link). No defaults. */
export function getTeamIdForSchedule (favouriteTeam: string | null): string | undefined {
  return favouriteTeam && favouriteTeam.trim() ? favouriteTeam : undefined;
}

/** Short label for team picker (e.g. "U14 Girls", "U16 Girls"). */
export function getAgeGroupDisplayName (team: ClubTeam): string {
  if (team.age) return `${ team.age } Girls`;
  const u = team.name.match(/\b(U\d+)\s*Girls?\b/i) || team.name.match(/\b(U\d+)\b/i);
  return u ? `${ u[ 1 ] } Girls` : team.name;
}

export function getStAlbansTeamInDivision (standings: Standing[], division: string): string | null {
  if (!division || !standings.length) return null;
  const found = standings.find(
    (s) => s.name.includes('St Albans') && s.name.includes(division)
  );
  return found?.name ?? null;
}

export type Standing = {
  rank: number;
  name: string;
  teamId?: string;
  scheduleLink?: string;
  MP: number;
  W: number;
  L: number;
  D: number;
  GF: number;
  GA: number;
  GD: number;
  PTS: number;
};

export type ResultsData = {
  teamNames: string[];
  rows: { teamName: string; cells: string[] }[];
};

export type Fixture = {
  date: string;
  time?: string;
  home: string;
  away: string;
  score?: string;
  played?: boolean;
  matchNumber?: string;
  location?: string;
  status?: string;
};

export function parseFixtureDate (f: { date?: string }): number {
  if (!f.date || f.date === 'TBD') return NaN;
  const d = new Date(f.date.replace(/\s*,?\s*/, ' '));
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

export function formatTimeForDisplay (time: string | undefined): string {
  if (!time || !time.trim()) return '–';
  return time.replace(/\s*(GMT|BST|EST|PST|CST|MST|EDT|PDT|CDT|MDT|CET|CEST|[A-Z]{2,4})$/i, '').trim() || '–';
}

export async function fetchResultsPage (
  eventId: string = DEFAULT_EVENT_ID,
  groupId: string = DEFAULT_GROUP_ID
): Promise<string> {
  const url = `${ GOTSPORT_BASE }/org_event/events/${ eventId }/results?group=${ groupId }`;
  return fetchHtml(url);
}

export const getSchedulePageUrl = (
  eventId: string = DEFAULT_EVENT_ID,
  groupId: string,
  teamId?: string | null
): string => {
  if (teamId) {
    return `${ GOTSPORT_BASE }/org_event/events/${ eventId }/schedules?team=${ teamId }`;
  }
  return `${ GOTSPORT_BASE }/org_event/events/${ eventId }/schedules?group=${ groupId }`;
};

export async function fetchTeamSchedulePage (
  eventId: string = DEFAULT_EVENT_ID,
  teamId: string
): Promise<string> {
  const url = `${ GOTSPORT_BASE }/org_event/events/${ eventId }/schedules?team=${ teamId }`;
  return fetchHtml(url);
}

/**
 * Parse a team schedule page for the group ID (results/standings link).
 * The schedule page linked from the clubs table contains links with group= – we use that.
 * Returns null if none found (no defaults).
 */
export function parseSchedulePageForGroupId (html: string): string | null {
  const root = parse(html);
  const links = root.querySelectorAll('a[href*="group="]');
  for (const a of links) {
    const href = a.getAttribute('href') ?? '';
    const match = href.match(/group=(\d+)/);
    if (match) return match[ 1 ];
  }
  return null;
}

export async function fetchSchedulePage (
  eventId: string = DEFAULT_EVENT_ID,
  groupId: string,
  teamId?: string | null
): Promise<string> {
  if (teamId) return fetchTeamSchedulePage(eventId, teamId);
  return fetchHtml(getSchedulePageUrl(eventId, groupId));
}

export function getGroupScheduleDateAllUrl (
  eventId: string = DEFAULT_EVENT_ID,
  groupId: string = DEFAULT_GROUP_ID
): string {
  return `${ GOTSPORT_BASE }/org_event/events/${ eventId }/schedules?date=All&group=${ groupId }`;
}

export async function fetchGroupScheduleDateAll (
  eventId: string = DEFAULT_EVENT_ID,
  groupId: string = DEFAULT_GROUP_ID
): Promise<string> {
  const url = getGroupScheduleDateAllUrl(eventId, groupId);
  return fetchHtml(url);
}

export type TeamCrest = { name: string; crestUrl: string };

export function parseTeamCrests (html: string): TeamCrest[] {
  const root = parse(html);
  const byName = new Map<string, string>();
  const imgs = root.querySelectorAll(
    'img[src*="/system/teams/logos/"], img[src*="/system/organizations/logos/"]'
  );
  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (!src) continue;
    const absoluteUrl = src.startsWith('http') ? src : `${ GOTSPORT_BASE }${ src.split('?')[ 0 ] }`;
    const cell = img.closest('td');
    if (!cell) continue;
    const link = cell.querySelector('a[href*="team="]');
    const name = link ? text(link).trim() : '';
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, absoluteUrl);
  }
  return Array.from(byName.entries()).map(([ name, crestUrl ]) => ({ name, crestUrl }));
}

function text (el: { text?: string; textContent?: string } | null): string {
  if (!el) return '';
  const raw = (el as { text?: string }).text ?? el.textContent ?? '';
  return raw.replace(/\s+/g, ' ').trim();
}

function cellText (cell: { querySelector?: (s: string) => { text?: string; textContent?: string } | null; text?: string; textContent?: string } | null): string {
  if (!cell) return '';
  const raw = text(cell);
  if (raw) return raw;
  const link = cell.querySelector?.('a');
  return link ? text(link) : '';
}

function getStatusFromTimeCell (cell: { querySelector?: (s: string) => { text?: string; textContent?: string } | null } | null): string | undefined {
  if (!cell?.querySelector) return undefined;
  const label = cell.querySelector('.label');
  if (!label) return undefined;
  return text(label).trim() || undefined;
}

export function parseFixtures (html: string): Fixture[] {
  const root = parse(html);
  const fixtures: Fixture[] = [];
  const seen = new Set<string>();
  const tables = root.querySelectorAll('table');

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;

    let headerRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[ i ].querySelectorAll('th, td');
      const headers = cells.map((c) => text(c).toLowerCase());
      const hasHome = headers.some((h) => h.includes('home'));
      const hasAway = headers.some((h) => h.includes('away'));
      const hasTime = headers.some((h) => h.includes('time'));
      if (hasHome && hasAway && (hasTime || headers.some((h) => h.includes('match')))) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) continue;

    const headerCells = rows[ headerRowIndex ].querySelectorAll('th, td');
    const headers = headerCells.map((c) => text(c).toLowerCase());
    const matchCol = headers.findIndex((h) => h.includes('match'));
    const timeCol = headers.findIndex((h) => h.includes('time'));
    const homeCol = headers.findIndex((h) => h.includes('home'));
    const resultsCol = headers.findIndex((h) => h.includes('result'));
    const awayCol = headers.findIndex((h) => h.includes('away'));
    const locationCol = headers.findIndex((h) => h.includes('location'));
    if (homeCol === -1 || awayCol === -1) continue;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const cells = rows[ r ].querySelectorAll('td');
      if (cells.length <= Math.max(homeCol, awayCol)) continue;
      const home = cellText(cells[ homeCol ]);
      const away = cellText(cells[ awayCol ]);
      if (!home || !away) continue;
      const key = `${ home }|${ away }|${ cellText(cells[ timeCol ]) }`;
      if (seen.has(key)) continue;
      seen.add(key);

      let date = '';
      let time = '';
      if (timeCol >= 0 && cells[ timeCol ]) {
        const timeCell = text(cells[ timeCol ]);
        const dateMatch = timeCell.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})/);
        if (dateMatch) date = dateMatch[ 1 ].replace(/\s*,?\s*/, ' ').trim();
        const timeMatch = timeCell.match(/(\d{1,2}:\d{2}\s*[AP]?M?\s*[A-Z]{2,4}?)/i) || timeCell.match(/(\d{1,2}:\d{2}\s*[AP]?M?)/i);
        if (timeMatch) time = timeMatch[ 1 ].trim();
        if (!date && timeCell) date = timeCell.split(/\n/)[ 0 ].trim() || 'TBD';
      }

      let score = '';
      let played = false;
      if (resultsCol >= 0 && cells[ resultsCol ]) {
        const v = (cellText(cells[ resultsCol ]) || text(cells[ resultsCol ])).trim();
        const scoreMatch = v && v.match(/(\d+)\s*[-–—]\s*(\d+)/);
        if (scoreMatch) {
          score = `${ scoreMatch[ 1 ] } - ${ scoreMatch[ 2 ] }`;
          played = true;
        }
      }

      let matchNumber: string | undefined;
      if (matchCol >= 0 && cells[ matchCol ]) matchNumber = text(cells[ matchCol ]).trim() || undefined;
      let location: string | undefined;
      if (locationCol >= 0 && cells[ locationCol ]) {
        const locLink = cells[ locationCol ].querySelector?.('a');
        location = locLink ? text(locLink).trim() : text(cells[ locationCol ]).trim();
        location = location || undefined;
      }
      let status = getStatusFromTimeCell(timeCol >= 0 ? cells[ timeCol ] : null);
      if (!status && timeCol >= 0 && cells[ timeCol ]) {
        const timeCellText = text(cells[ timeCol ]).toLowerCase();
        if (/rained\s*out/.test(timeCellText)) status = 'Rained out';
        else if (/discipline/.test(timeCellText)) status = 'Discipline';
        else if (/cancelled|canceled/.test(timeCellText)) status = 'Cancelled';
        else if (/postponed/.test(timeCellText)) status = 'Postponed';
        else if (/abandoned/.test(timeCellText)) status = 'Abandoned';
      }

      fixtures.push({
        date: date || 'TBD',
        ...(time && { time }),
        home: home.trim(),
        away: away.trim(),
        ...(score && { score, played: true }),
        ...(matchNumber && { matchNumber }),
        ...(location && { location }),
        ...(status && { status }),
      });
    }
  }
  return fixtures;
}

/** Parse league/group name from results page (e.g. "Female U14 - Orange") */
export function parseLeagueName (html: string): string {
  const root = parse(html);
  const lead = root.querySelector('.lead');
  if (!lead) return '';
  const raw = (lead.textContent || lead.text || '').trim();
  return raw.replace(/\s+/g, ' ').trim();
}

export function parseStandings (html: string, eventId: string = DEFAULT_EVENT_ID): Standing[] {
  const root = parse(html);
  const standings: Standing[] = [];
  const tables = root.querySelectorAll('table');

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;
    const headerText = text(rows[ 0 ]);
    if (!headerText.includes('MP') || !headerText.includes('PTS')) continue;

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[ r ].querySelectorAll('td');
      if (cells.length < 10) continue;
      const rankNum = parseInt(text(cells[ 0 ]), 10);
      if (Number.isNaN(rankNum)) continue;
      const teamCell = cells[ 1 ];
      const name = text(teamCell);
      const link = teamCell?.querySelector('a[href*="team="]');
      const href = link?.getAttribute('href') || '';
      const teamMatch = href.match(/team=(\d+)/);
      const teamId = teamMatch ? teamMatch[ 1 ] : undefined;
      const scheduleLink = teamId
        ? `${ GOTSPORT_BASE }/org_event/events/${ eventId }/schedules?team=${ teamId }`
        : undefined;
      const parseNum = (i: number, def = 0) => {
        const n = parseInt(text(cells[ i ]), 10);
        return Number.isNaN(n) ? def : n;
      };
      standings.push({
        rank: rankNum,
        name,
        ...(teamId && { teamId }),
        ...(scheduleLink && { scheduleLink }),
        MP: parseNum(2),
        W: parseNum(3),
        L: parseNum(4),
        D: parseNum(5),
        GF: parseNum(6),
        GA: parseNum(7),
        GD: parseNum(8),
        PTS: parseNum(9),
      });
    }
    break;
  }
  return standings;
}

export function parseResultsMatrix (html: string): ResultsData {
  const root = parse(html);
  const teamNames: string[] = [];
  const rows: { teamName: string; cells: string[] }[] = [];
  const tables = root.querySelectorAll('table');

  for (const table of tables) {
    const trs = table.querySelectorAll('tr');
    if (trs.length < 2) continue;
    const headerCells = trs[ 0 ].querySelectorAll('th, td');
    const firstHeader = text(headerCells[ 0 ]);
    if (firstHeader !== 'Team Name' && !firstHeader.includes('Team')) continue;
    const names = headerCells.slice(1, -2).map((el) => text(el));
    teamNames.push(...names);
    for (let r = 1; r < trs.length; r++) {
      const cells = trs[ r ].querySelectorAll('td');
      if (cells.length < 2) continue;
      const teamName = text(cells[ 0 ]);
      const cellValues: string[] = [];
      for (let i = 1; i <= teamNames.length; i++) {
        const raw = text(cells[ i ]);
        const normalized = raw.split(/\s+/).filter((s) => s && s !== '-').join(', ') || '-';
        cellValues.push(normalized || '-');
      }
      rows.push({ teamName, cells: cellValues });
    }
    break;
  }
  return { teamNames, rows };
}

export async function scrapeGroup (
  eventId: string = DEFAULT_EVENT_ID,
  groupId: string = DEFAULT_GROUP_ID,
  teamId?: string | null
): Promise<{ standings: Standing[]; results: ResultsData; fixtures: Fixture[]; leagueName: string; crests: TeamCrest[] }> {
  const html = await fetchResultsPage(eventId, groupId);
  const standings = parseStandings(html, eventId);
  const results = parseResultsMatrix(html);
  const leagueName = parseLeagueName(html);
  const crestsFromResults = parseTeamCrests(html);
  const scheduleHtml = teamId
    ? await fetchTeamSchedulePage(eventId, teamId)
    : await fetchSchedulePage(eventId, groupId);
  const fixtures = parseFixtures(scheduleHtml);
  const crestsFromSchedule = parseTeamCrests(scheduleHtml);
  const byName = new Map<string, string>();
  for (const c of crestsFromResults) byName.set(c.name, c.crestUrl);
  for (const c of crestsFromSchedule) if (!byName.has(c.name)) byName.set(c.name, c.crestUrl);
  const crests = Array.from(byName.entries()).map(([ name, crestUrl ]) => ({ name, crestUrl }));
  return { standings, results, fixtures, leagueName, crests };
}

export async function scrapeFixtures (
  eventId: string = DEFAULT_EVENT_ID,
  groupId: string = DEFAULT_GROUP_ID
): Promise<Fixture[]> {
  const html = await fetchGroupScheduleDateAll(eventId, groupId);
  return parseFixtures(html);
}
