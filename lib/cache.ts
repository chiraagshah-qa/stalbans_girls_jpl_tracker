import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Standing, ResultsData, Fixture, ClubTeam, TeamCrest } from './scraper';
import {
  fetchClubsPage,
  parseClubsPage,
  fetchTeamSchedulePage,
  parseSchedulePageForGroupId,
} from './scraper';
import { getEventId } from './eventConfig';

const CACHE_PREFIX = 'gotsport_group_';
const CACHE_KEY = (groupId: string) => `${CACHE_PREFIX}${groupId}`;
const TEAMS_CACHE_KEY = 'gotsport_clubs_teams';
const GROUP_ID_FOR_TEAM_PREFIX = 'gotsport_team_group_';
const CRESTS_CACHE_KEY = 'gotsport_crests';

export async function getCachedGroupData(groupId: string): Promise<{
  standings: Standing[];
  results: ResultsData;
  fixtures: Fixture[];
  updatedAt?: number;
  leagueName?: string;
} | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY(groupId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.standings && Array.isArray(data.standings) && data?.results && data?.fixtures) {
      return {
        standings: data.standings,
        results: data.results,
        fixtures: Array.isArray(data.fixtures) ? data.fixtures : [],
        updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
        leagueName: typeof data.leagueName === 'string' ? data.leagueName : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedGroupData(
  groupId: string,
  standings: Standing[],
  results: ResultsData,
  fixtures: Fixture[],
  leagueName?: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY(groupId),
      JSON.stringify({ standings, results, fixtures, updatedAt: Date.now(), leagueName: leagueName ?? '' })
    );
  } catch {}
}

export async function getCachedTeams(): Promise<ClubTeam[] | null> {
  try {
    const raw = await AsyncStorage.getItem(TEAMS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data?.teams) && data.teams.length > 0) {
      return data.teams as ClubTeam[];
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedTeams(teams: ClubTeam[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      TEAMS_CACHE_KEY,
      JSON.stringify({ teams, updatedAt: Date.now() })
    );
  } catch {}
}

/** Load teams from cache or fetch from GotSport clubs page. Returns [] on failure. */
export async function getTeams(): Promise<ClubTeam[]> {
  try {
    const cached = await getCachedTeams();
    if (cached?.length) return cached;
    const html = await fetchClubsPage(getEventId());
    const teams = parseClubsPage(html);
    if (teams.length) await setCachedTeams(teams);
    return teams;
  } catch {
    return [];
  }
}

export async function getCachedGroupIdForTeam(teamId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(GROUP_ID_FOR_TEAM_PREFIX + teamId);
    if (!raw) return null;
    const id = raw.trim();
    return id || null;
  } catch {
    return null;
  }
}

export async function setCachedGroupIdForTeam(teamId: string, groupId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(GROUP_ID_FOR_TEAM_PREFIX + teamId, groupId);
  } catch {}
}

/**
 * Resolve groupId for a team by scraping its schedule page (the link from the clubs page).
 * Uses cache when available; otherwise fetches the team's schedule URL and parses group= from the page.
 * No default or fallback – returns null if not found.
 */
export async function getGroupIdForTeam(teamId: string | null): Promise<string | null> {
  if (!teamId || !teamId.trim()) return null;
  const cached = await getCachedGroupIdForTeam(teamId);
  if (cached) return cached;
  try {
    const html = await fetchTeamSchedulePage(getEventId(), teamId);
    const groupId = parseSchedulePageForGroupId(html);
    if (groupId) await setCachedGroupIdForTeam(teamId, groupId);
    return groupId;
  } catch {
    return null;
  }
}

export async function getCachedCrests(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(CRESTS_CACHE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export async function setCachedCrests(crests: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(CRESTS_CACHE_KEY, JSON.stringify(crests));
  } catch {}
}

/** Merge newly scraped crests into the persisted cache. */
export async function mergeCrestsIntoCache(newCrests: TeamCrest[]): Promise<Record<string, string>> {
  const current = await getCachedCrests();
  for (const { name, crestUrl } of newCrests) {
    if (name && crestUrl) current[name] = crestUrl;
  }
  await setCachedCrests(current);
  return current;
}
