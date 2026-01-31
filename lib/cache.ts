import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Standing, ResultsData, Fixture } from './scraper';

const CACHE_PREFIX = 'gotsport_group_';
const CACHE_KEY = (groupId: string) => `${CACHE_PREFIX}${groupId}`;

export async function getCachedGroupData(groupId: string): Promise<{
  standings: Standing[];
  results: ResultsData;
  fixtures: Fixture[];
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
  fixtures: Fixture[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY(groupId),
      JSON.stringify({ standings, results, fixtures })
    );
  } catch {}
}
