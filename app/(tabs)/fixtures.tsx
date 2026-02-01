import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scrapeFixtures,
  getGroupIdForTeam,
  formatTimeForDisplay,
  parseFixtureDate as parseFixtureDateScraper,
  type Fixture,
} from '../../lib/scraper';
import { getCachedGroupData, setCachedGroupData } from '../../lib/cache';
import { getDisplayTeamName } from '../../lib/badges';
import { TeamBadge } from '../../components/TeamBadge';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseFixtureDate(f: Fixture): number {
  return parseFixtureDateScraper(f);
}

/** YYYY-MM-DD in local time for reliable date-only comparison */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayLabel(dayStart: Date, todayStart: Date): string {
  const diff = Math.round((dayStart.getTime() - todayStart.getTime()) / ONE_DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return dayStart.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function FixturesScreen() {
  const [hydrating, setHydrating] = useState(true);
  const [favouriteTeam, setFavouriteTeam] = useState<string | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFavourite = async () => {
    try {
      const saved = await AsyncStorage.getItem(FAVOURITE_STORAGE_KEY);
      setFavouriteTeam(saved);
    } catch {
      setFavouriteTeam(null);
    } finally {
      setHydrating(false);
    }
  };

  const loadData = async (isRefresh = false) => {
    if (!favouriteTeam) return;
    const groupId = getGroupIdForTeam(favouriteTeam);
    let hadCache = false;
    if (!isRefresh) {
      const cached = await getCachedGroupData(groupId);
      if (cached?.fixtures?.length) {
        setFixtures(cached.fixtures);
        setError(null);
        hadCache = true;
      }
    }
    if (isRefresh) setRefreshing(true);
    else if (!hadCache) setLoading(true);
    setError(null);
    try {
      const fixturesFromDateAll = await scrapeFixtures(undefined, groupId);
      if (fixturesFromDateAll.length > 0) {
        setFixtures(fixturesFromDateAll);
        const cached = await getCachedGroupData(groupId);
        if (cached) {
          await setCachedGroupData(groupId, cached.standings, cached.results, fixturesFromDateAll, cached.leagueName);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fixtures');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(() => {
    loadFavourite();
  });

  useEffect(() => {
    if (favouriteTeam) loadData();
  }, [favouriteTeam]);

  if (hydrating) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!favouriteTeam) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>No team selected</Text>
        <Text style={styles.emptyText}>Go to Settings and choose U14 or U16.</Text>
      </View>
    );
  }

  if (loading && fixtures.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={styles.loadingText}>Loading fixtures…</Text>
      </View>
    );
  }

  if (error && fixtures.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryHint}>Pull down to retry</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(true)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (fixtures.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContainer}>
        <Text style={styles.emptyTitle}>No fixtures found</Text>
        <Text style={styles.emptyText}>Pull down to refresh from GotSport.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData(true)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const todayStart = getDayStart(new Date());
  const todayStr = toDateString(todayStart);
  const endDate = new Date(todayStart);
  endDate.setDate(endDate.getDate() + 14);
  const endStr = toDateString(endDate);

  const allWithDate = fixtures
    .map((f) => ({ f, t: parseFixtureDate(f) }))
    .filter(({ t }) => !isNaN(t))
    .filter(({ t }) => {
      const fixtureDateStr = toDateString(new Date(t));
      return fixtureDateStr >= todayStr && fixtureDateStr <= endStr;
    })
    .sort((a, b) => a.t - b.t);
  const noDateFixtures = fixtures
    .filter((f) => isNaN(parseFixtureDate(f)))
    .map((f) => ({ f, t: NaN }));

  const byDay: { dayStart: Date; fixtures: Fixture[] }[] = [];
  const dayStarts = new Set<number>();
  for (const { t } of allWithDate) {
    dayStarts.add(getDayStart(new Date(t)).getTime());
  }
  const sortedDayStarts = Array.from(dayStarts).sort((a, b) => a - b);
  for (const dayStartMs of sortedDayStarts) {
    const dayStart = new Date(dayStartMs);
    const dayEnd = new Date(dayStartMs + ONE_DAY_MS);
    const dayFixtures = allWithDate
      .filter(({ t }) => {
        const fd = getDayStart(new Date(t));
        return fd.getTime() >= dayStart.getTime() && fd.getTime() < dayEnd.getTime();
      })
      .map(({ f }) => f);
    if (dayFixtures.length > 0) {
      byDay.push({ dayStart, fixtures: dayFixtures });
    }
  }
  const hasNoDate = noDateFixtures.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#FFD700" />
      }
    >
      {byDay.length === 0 && !hasNoDate ? (
        <Text style={styles.placeholder}>No fixtures.</Text>
      ) : (
        <>
          {byDay.map(({ dayStart, fixtures: dayFixtures }) => (
            <View key={dayStart.getTime()} style={styles.daySection}>
              <Text style={styles.dayTitle}>{formatDayLabel(dayStart, todayStart)}</Text>
              {dayFixtures.map((f, i) => (
                <View key={`${f.home}-${f.away}-${i}`} style={styles.card}>
                  <View style={styles.cardTeamRow}>
                    <TeamBadge teamName={f.home} size={28} />
                    <Text style={styles.cardTeamName} numberOfLines={1}>{getDisplayTeamName(f.home)}</Text>
                  </View>
                  <Text style={styles.cardScoreLine}>
                    {f.played && f.score !== undefined
                      ? f.score.replace(/\s*[-–—]\s*/g, ' v ')
                      : 'v'}
                  </Text>
                  <View style={styles.cardTeamRow}>
                    <TeamBadge teamName={f.away} size={28} />
                    <Text style={styles.cardTeamName} numberOfLines={1}>{getDisplayTeamName(f.away)}</Text>
                  </View>
                  <Text style={styles.dateLine}>
                    {f.date}
                    {f.time ? ` · ${formatTimeForDisplay(f.time)}` : ''}
                  </Text>
                  {f.status && f.status.toLowerCase() !== 'scheduled' && (
                    <View style={[styles.statusBadge, f.status === 'Rained Out' ? styles.statusDanger : f.status === 'Discipline' ? styles.statusWarning : styles.statusDefault]}>
                      <Text style={[styles.statusText, f.status === 'Rained Out' ? styles.statusTextDanger : f.status === 'Discipline' ? styles.statusTextWarning : styles.statusTextDefault]}>
                        {f.status}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))
          }
          {hasNoDate && (
            <View style={styles.daySection}>
              {noDateFixtures.map(({ f }, i) => (
                <View key={`${f.home}-${f.away}-${i}`} style={styles.card}>
                  <View style={styles.cardTeamRow}>
                    <TeamBadge teamName={f.home} size={28} />
                    <Text style={styles.cardTeamName} numberOfLines={1}>{getDisplayTeamName(f.home)}</Text>
                  </View>
                  <Text style={styles.cardScoreLine}>
                    {f.played && f.score !== undefined
                      ? f.score.replace(/\s*[-–—]\s*/g, ' v ')
                      : 'v'}
                  </Text>
                  <View style={styles.cardTeamRow}>
                    <TeamBadge teamName={f.away} size={28} />
                    <Text style={styles.cardTeamName} numberOfLines={1}>{getDisplayTeamName(f.away)}</Text>
                  </View>
                  <Text style={styles.dateLine}>
                    {f.date}
                    {f.time ? ` · ${formatTimeForDisplay(f.time)}` : ''}
                  </Text>
                  {f.status && f.status.toLowerCase() !== 'scheduled' && (
                    <View style={[styles.statusBadge, f.status === 'Rained Out' ? styles.statusDanger : f.status === 'Discipline' ? styles.statusWarning : styles.statusDefault]}>
                      <Text style={[styles.statusText, f.status === 'Rained Out' ? styles.statusTextDanger : f.status === 'Discipline' ? styles.statusTextWarning : styles.statusTextDefault]}>
                        {f.status}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#666', marginTop: 12 },
  emptyTitle: { color: '#111', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center' },
  errorText: { color: '#e94560', fontSize: 16, textAlign: 'center' },
  retryHint: { color: '#666', marginTop: 8, fontSize: 12 },
  retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#0a2463', borderRadius: 8 },
  retryBtnText: { color: '#FFD700', fontWeight: '600' },
  placeholder: { color: '#888', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  daySection: { marginBottom: 20 },
  dayTitle: {
    color: '#0a2463',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  cardTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardTeamName: { fontSize: 14, color: '#111', fontWeight: '600', textAlign: 'center' },
  cardScoreLine: { fontSize: 18, fontWeight: '700', color: '#0a2463', marginVertical: 6, textAlign: 'center' },
  dateLine: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  statusDefault: { backgroundColor: '#e9ecef' },
  statusDanger: { backgroundColor: '#f8d7da' },
  statusWarning: { backgroundColor: '#fff3cd' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextDefault: { color: '#495057' },
  statusTextDanger: { color: '#721c24' },
  statusTextWarning: { color: '#856404' },
});
