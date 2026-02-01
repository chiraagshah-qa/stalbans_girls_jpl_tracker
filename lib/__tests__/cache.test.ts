import { getCachedGroupData, setCachedGroupData } from '../cache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Standing, ResultsData, Fixture } from '../scraper';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const sampleStandings: Standing[] = [
  { name: 'Team A', rank: 1, MP: 5, W: 4, L: 1, D: 0, GF: 10, GA: 2, GD: 8, PTS: 12 },
];
const sampleResults: ResultsData = { teamNames: [], rows: [] };
const sampleFixtures: Fixture[] = [
  { date: 'Jan 15, 2026', home: 'Team A', away: 'Team B' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getCachedGroupData', () => {
  it('returns null when no cached data', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await getCachedGroupData('group1');
    expect(result).toBeNull();
    expect(mockGetItem).toHaveBeenCalledWith('gotsport_group_group1');
  });

  it('returns null for invalid JSON or missing fields', async () => {
    mockGetItem.mockResolvedValue('{}');
    const result = await getCachedGroupData('group1');
    expect(result).toBeNull();
  });

  it('returns parsed cache when valid', async () => {
    const cached = {
      standings: sampleStandings,
      results: sampleResults,
      fixtures: sampleFixtures,
      updatedAt: Date.now(),
      leagueName: 'Test League',
    };
    mockGetItem.mockResolvedValue(JSON.stringify(cached));
    const result = await getCachedGroupData('group1');
    expect(result).not.toBeNull();
    expect(result?.standings).toEqual(sampleStandings);
    expect(result?.fixtures).toEqual(sampleFixtures);
    expect(result?.leagueName).toBe('Test League');
  });
});

describe('setCachedGroupData', () => {
  it('calls setItem with stringified data', async () => {
    mockSetItem.mockResolvedValue(undefined);
    await setCachedGroupData('group1', sampleStandings, sampleResults, sampleFixtures, 'League');
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const [ key, value ] = mockSetItem.mock.calls[ 0 ];
    expect(key).toBe('gotsport_group_group1');
    const parsed = JSON.parse(value);
    expect(parsed.standings).toEqual(sampleStandings);
    expect(parsed.fixtures).toEqual(sampleFixtures);
    expect(parsed.leagueName).toBe('League');
    expect(typeof parsed.updatedAt).toBe('number');
  });
});
