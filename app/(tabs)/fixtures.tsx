import { useEffect, useState, useRef } from 'react';
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
  getTeamIdForSchedule,
  formatTimeForDisplay,
  parseFixtureDate,
  type Fixture,
} from '../../lib/scraper';
import { getCachedGroupData, setCachedGroupData, getGroupIdForTeam } from '../../lib/cache';
import { getDisplayTeamName } from '../../lib/badges';
import { formatLastUpdated } from '../../lib/format';
import { useDelayedError } from '../../lib/useDelayedError';
import { setAccessibilityFocus, announceForAccessibility } from '../../lib/accessibility';
import { TeamBadge } from '../../components/TeamBadge';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getDayStart (date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Date string has a 4-digit year (from scraper regex), so parse is reliable */
function hasCalendarDate (f: Fixture): boolean {
  return !!(f.date && f.date !== 'TBD' && /\d{4}/.test(f.date));
}

/** Parse fixture date to timestamp for past/upcoming comparison */
function parseDate (f: Fixture): number {
  if (!hasCalendarDate(f)) return NaN;
  const t = parseFixtureDate(f);
  if (!isNaN(t)) return t;
  if (f.date && f.date !== 'TBD') {
    const d = new Date(f.date.replace(/\s*,?\s*/, ' ').replace(/\s+/g, ' ').trim());
    return isNaN(d.getTime()) ? NaN : d.getTime();
  }
  return NaN;
}

function formatDayLabel (dayStart: Date, todayStart: Date, isPast: boolean): string {
  const diff = Math.round((dayStart.getTime() - todayStart.getTime()) / ONE_DAY_MS);
  if (!isPast) {
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
  }
  return dayStart.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isRainedOut (f: Fixture): boolean {
  const s = [ f.status, f.time ].filter(Boolean).join(' ');
  return /rained\s*out/i.test(s);
}

function isDiscipline (f: Fixture): boolean {
  return /discipline/i.test(f.status || '');
}

type FixturesTab = 'upcoming' | 'past';

export default function FixturesScreen () {
  const [ activeTab, setActiveTab ] = useState<FixturesTab>('upcoming');
  const [ hydrating, setHydrating ] = useState(true);
  const [ favouriteTeam, setFavouriteTeam ] = useState<string | null>(null);
  const [ fixtures, setFixtures ] = useState<Fixture[]>([]);
  const [ loading, setLoading ] = useState(true);
  const [ refreshing, setRefreshing ] = useState(false);
  const [ displayError, setError ] = useDelayedError();
  const [ lastUpdated, setLastUpdated ] = useState<number | null>(null);
  const fixturesContentRef = useRef<ScrollView>(null);
  const prevTabRef = useRef<FixturesTab>('upcoming');

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      const msg = activeTab === 'upcoming' ? 'Showing upcoming fixtures' : 'Showing past fixtures';
      announceForAccessibility(msg);
      const t = setTimeout(() => setAccessibilityFocus(fixturesContentRef), 150);
      return () => clearTimeout(t);
    }
  }, [ activeTab ]);

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
    const groupId = await getGroupIdForTeam(favouriteTeam);
    if (!groupId) {
      setError('Unable to load fixtures for this team. Use Settings → Refresh team list and try again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    let hadCache = false;
    if (!isRefresh) {
      const cached = await getCachedGroupData(groupId);
      if (cached?.fixtures?.length) {
        setFixtures(cached.fixtures);
        if (cached.updatedAt != null) setLastUpdated(cached.updatedAt);
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
        setLastUpdated(Date.now());
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
  }, [ favouriteTeam ]);

  if (hydrating) {
    return (
      <View style={ styles.centerContainer }>
        <ActivityIndicator size="large" color="#e94560" />
        <Text style={ styles.loadingText } accessibilityLiveRegion="polite">
          Loading…
        </Text>
      </View>
    );
  }

  if (!favouriteTeam) {
    return (
      <View
        style={ styles.centerContainer }
        accessible
        accessibilityLabel="No team selected. Go to Settings and choose U14 or U16."
      >
        <Text style={ styles.emptyTitle }>No team selected</Text>
        <Text style={ styles.emptyText }>Go to Settings and choose U14 or U16.</Text>
      </View>
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const withDate = fixtures
    .map((f) => ({ f, t: parseDate(f) }))
    .filter(({ t }) => !isNaN(t));
  const noDateFixtures = fixtures
    .filter((f) => isNaN(parseDate(f)))
    .map((f) => ({ f, t: NaN }));

  const isPast = (f: Fixture): boolean =>
    f.played === true ||
    (f.score != null && f.score !== '') ||
    isRainedOut(f) ||
    isDiscipline(f) ||
    (hasCalendarDate(f) && parseDate(f) < todayStartMs);
  const pastWithDate = withDate.filter(({ f }) => isPast(f));
  const upcomingWithDate = withDate.filter(({ f }) => !isPast(f) && parseDate(f) >= todayStartMs);
  const pastNoDate = noDateFixtures.filter(({ f }) => isPast(f));
  const upcomingNoDate = noDateFixtures.filter(({ f }) => !isPast(f));

  function buildByDay (
    items: { f: Fixture; t: number }[],
    sortAsc: boolean
  ): { dayStart: Date; fixtures: Fixture[] }[] {
    const dayStarts = new Set<number>();
    for (const { t } of items) {
      dayStarts.add(getDayStart(new Date(t)).getTime());
    }
    const sortedDayStarts = Array.from(dayStarts).sort((a, b) => (sortAsc ? a - b : b - a));
    const byDay: { dayStart: Date; fixtures: Fixture[] }[] = [];
    for (const dayStartMs of sortedDayStarts) {
      const dayStart = new Date(dayStartMs);
      const dayEnd = new Date(dayStartMs + ONE_DAY_MS);
      const dayFixtures = items
        .filter(({ t }) => {
          const fd = getDayStart(new Date(t));
          return fd.getTime() >= dayStart.getTime() && fd.getTime() < dayEnd.getTime();
        })
        .map(({ f }) => f);
      if (dayFixtures.length > 0) {
        byDay.push({ dayStart, fixtures: dayFixtures });
      }
    }
    return byDay;
  }

  const pastByDay = buildByDay(pastWithDate, false);
  const upcomingByDay = buildByDay(upcomingWithDate, true);
  const hasPast = pastByDay.length > 0 || pastNoDate.length > 0;
  const hasUpcoming = upcomingByDay.length > 0 || upcomingNoDate.length > 0;

  const showUpcoming = activeTab === 'upcoming';
  const showPast = activeTab === 'past';

  function getFixtureCardLabel (f: Fixture): string {
    const home = getDisplayTeamName(f.home);
    const away = getDisplayTeamName(f.away);
    const dateTime = `${ f.date }${ f.time ? ` at ${ formatTimeForDisplay(f.time) }` : '' }`;
    const loc = f.location ? `. ${ f.location }` : '';
    const status = f.status && f.status.toLowerCase() !== 'scheduled' ? `. Status: ${ f.status }` : '';
    const score = f.played && f.score !== undefined ? `. Score: ${ f.score.replace(/\s*[-–—]\s*/g, ' ') }` : '';
    return `${ home } versus ${ away }. ${ dateTime }${ loc }${ status }${ score }`;
  }

  function renderUpcomingContent () {
    if (!hasUpcoming) return <Text style={ styles.placeholder }>No upcoming fixtures.</Text>;
    return (
      <View style={ styles.sectionBlock }>
        { upcomingByDay.map(({ dayStart, fixtures: dayFixtures }) => (
          <View key={ `upcoming-${ dayStart.getTime() }` } style={ styles.daySection }>
            <Text style={ styles.dayTitle }>{ formatDayLabel(dayStart, todayStart, false) }</Text>
            { dayFixtures.map((f, i) => (
              <View
                key={ `${ f.home }-${ f.away }-${ i }` }
                style={ styles.card }
                accessible
                accessibilityRole="summary"
                accessibilityLabel={ getFixtureCardLabel(f) }
              >
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.home } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.home) }</Text>
                </View>
                <Text style={ styles.cardScoreLine } accessible={ false }>
                  { f.played && f.score !== undefined
                    ? f.score.replace(/\s*[-–—]\s*/g, ' v ')
                    : 'v' }
                </Text>
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.away } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.away) }</Text>
                </View>
                <Text style={ styles.dateLine } accessible={ false }>
                  { f.date }
                  { f.time ? ` · ${ formatTimeForDisplay(f.time) }` : '' }
                </Text>
                { f.status && f.status.toLowerCase() !== 'scheduled' && (
                  <View style={ [ styles.statusBadge, f.status === 'Rained Out' ? styles.statusDanger : f.status === 'Discipline' ? styles.statusWarning : styles.statusDefault ] } accessible={ false }>
                    <Text style={ [ styles.statusText, f.status === 'Rained Out' ? styles.statusTextDanger : f.status === 'Discipline' ? styles.statusTextWarning : styles.statusTextDefault ] }>
                      { f.status }
                    </Text>
                  </View>
                ) }
              </View>
            )) }
          </View>
        )) }
        { upcomingNoDate.length > 0 && (
          <View style={ styles.daySection }>
            { upcomingNoDate.map(({ f }, i) => (
              <View
                key={ `${ f.home }-${ f.away }-${ i }` }
                style={ styles.card }
                accessible
                accessibilityRole="summary"
                accessibilityLabel={ getFixtureCardLabel(f) }
              >
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.home } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.home) }</Text>
                </View>
                <Text style={ styles.cardScoreLine } accessible={ false }>
                  { f.played && f.score !== undefined
                    ? f.score.replace(/\s*[-–—]\s*/g, ' v ')
                    : 'v' }
                </Text>
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.away } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.away) }</Text>
                </View>
                <Text style={ styles.dateLine } accessible={ false }>
                  { f.date }
                  { f.time ? ` · ${ formatTimeForDisplay(f.time) }` : '' }
                </Text>
                { f.status && f.status.toLowerCase() !== 'scheduled' && (
                  <View style={ [ styles.statusBadge, f.status === 'Rained Out' ? styles.statusDanger : f.status === 'Discipline' ? styles.statusWarning : styles.statusDefault ] } accessible={ false }>
                    <Text style={ [ styles.statusText, f.status === 'Rained Out' ? styles.statusTextDanger : f.status === 'Discipline' ? styles.statusTextWarning : styles.statusTextDefault ] }>
                      { f.status }
                    </Text>
                  </View>
                ) }
              </View>
            )) }
          </View>
        ) }
      </View>
    );
  }

  function renderPastContent () {
    if (!hasPast) return <Text style={ styles.placeholder }>No past fixtures.</Text>;
    return (
      <View style={ styles.sectionBlock }>
        { pastByDay.map(({ dayStart, fixtures: dayFixtures }) => (
          <View key={ `past-${ dayStart.getTime() }` } style={ styles.daySection }>
            <Text style={ styles.dayTitle }>{ formatDayLabel(dayStart, todayStart, true) }</Text>
            { dayFixtures.map((f, i) => (
              <View
                key={ `${ f.home }-${ f.away }-${ i }` }
                style={ styles.card }
                accessible
                accessibilityRole="summary"
                accessibilityLabel={ getFixtureCardLabel(f) }
              >
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.home } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.home) }</Text>
                </View>
                <Text style={ styles.cardScoreLine } accessible={ false }>
                  { f.played && f.score !== undefined
                    ? f.score.replace(/\s*[-–—]\s*/g, ' v ')
                    : 'v' }
                </Text>
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.away } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.away) }</Text>
                </View>
                <Text style={ styles.dateLine } accessible={ false }>
                  { f.date }
                  { f.time ? ` · ${ formatTimeForDisplay(f.time) }` : '' }
                </Text>
                { f.status && f.status.toLowerCase() !== 'scheduled' && (
                  <View style={ [ styles.statusBadge, f.status === 'Rained Out' ? styles.statusDanger : f.status === 'Discipline' ? styles.statusWarning : styles.statusDefault ] } accessible={ false }>
                    <Text style={ [ styles.statusText, f.status === 'Rained Out' ? styles.statusTextDanger : f.status === 'Discipline' ? styles.statusTextWarning : styles.statusTextDefault ] }>
                      { f.status }
                    </Text>
                  </View>
                ) }
              </View>
            )) }
          </View>
        )) }
        { pastNoDate.length > 0 && (
          <View style={ styles.daySection }>
            { pastNoDate.map(({ f }, i) => (
              <View
                key={ `past-nd-${ f.home }-${ f.away }-${ i }` }
                style={ styles.card }
                accessible
                accessibilityRole="summary"
                accessibilityLabel={ getFixtureCardLabel(f) }
              >
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.home } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.home) }</Text>
                </View>
                <Text style={ styles.cardScoreLine } accessible={ false }>
                  { f.played && f.score !== undefined
                    ? f.score.replace(/\s*[-–—]\s*/g, ' v ')
                    : 'v' }
                </Text>
                <View style={ styles.cardTeamRow } accessible={ false }>
                  <TeamBadge teamName={ f.away } size={ 28 } />
                  <Text style={ styles.cardTeamName } numberOfLines={ 1 }>{ getDisplayTeamName(f.away) }</Text>
                </View>
                <Text style={ styles.dateLine } accessible={ false }>
                  { f.date }
                  { f.time ? ` · ${ formatTimeForDisplay(f.time) }` : '' }
                </Text>
                { f.status && f.status.toLowerCase() !== 'scheduled' && (
                  <View style={ [ styles.statusBadge, f.status === 'Rained Out' ? styles.statusDanger : f.status === 'Discipline' ? styles.statusWarning : styles.statusDefault ] } accessible={ false }>
                    <Text style={ [ styles.statusText, f.status === 'Rained Out' ? styles.statusTextDanger : f.status === 'Discipline' ? styles.statusTextWarning : styles.statusTextDefault ] }>
                      { f.status }
                    </Text>
                  </View>
                ) }
              </View>
            )) }
          </View>
        ) }
      </View>
    );
  }

  return (
    <View style={ styles.container }>
      <View style={ styles.tabBar }>
        <TouchableOpacity
          style={ [ styles.tab, showUpcoming && styles.tabActive ] }
          onPress={ () => setActiveTab('upcoming') }
          activeOpacity={ 0.7 }
          accessibilityRole="button"
          accessibilityLabel="Show upcoming fixtures"
          accessibilityState={ { selected: showUpcoming } }
        >
          <Text style={ [ styles.tabText, showUpcoming && styles.tabTextActive ] }>upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={ [ styles.tab, showPast && styles.tabActive ] }
          onPress={ () => setActiveTab('past') }
          activeOpacity={ 0.7 }
          accessibilityRole="button"
          accessibilityLabel="Show past fixtures"
          accessibilityState={ { selected: showPast } }
        >
          <Text style={ [ styles.tabText, showPast && styles.tabTextActive ] }>past</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        ref={ fixturesContentRef }
        style={ styles.scroll }
        contentContainerStyle={ [ styles.content, (loading && fixtures.length === 0) && styles.contentCenter ] }
        refreshControl={
          <RefreshControl refreshing={ refreshing } onRefresh={ () => loadData(true) } tintColor="#FFD700" />
        }
        accessible
        accessibilityLabel={ activeTab === 'upcoming' ? 'Upcoming fixtures list' : 'Past fixtures list' }
      >
        { loading && fixtures.length === 0 ? (
          <View style={ styles.centerContainer }>
            <ActivityIndicator size="large" color="#e94560" />
            <Text style={ styles.loadingText } accessibilityLiveRegion="polite">
              Loading fixtures…
            </Text>
          </View>
        ) : displayError && fixtures.length === 0 ? (
          <View style={ styles.centerContainer }>
            <Text
              style={ styles.errorText }
              accessibilityLiveRegion="polite"
            >
              { displayError }
            </Text>
            <Text style={ styles.retryHint }>Pull down to retry</Text>
            <TouchableOpacity
              style={ styles.retryBtn }
              onPress={ () => loadData(true) }
              accessibilityRole="button"
              accessibilityLabel="Retry loading fixtures"
              accessibilityHint="Loads fixtures again from the server"
            >
              <Text style={ styles.retryBtnText }>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : fixtures.length === 0 ? (
          <View style={ styles.centerContainer }>
            <Text style={ styles.emptyTitle }>No fixtures found</Text>
            <Text style={ styles.emptyText }>Pull down to refresh from GotSport.</Text>
            <TouchableOpacity
              style={ styles.retryBtn }
              onPress={ () => loadData(true) }
              accessibilityRole="button"
              accessibilityLabel="Retry loading fixtures"
              accessibilityHint="Loads fixtures again from the server"
            >
              <Text style={ styles.retryBtnText }>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          showUpcoming ? renderUpcomingContent() : renderPastContent()
        ) }
        { lastUpdated != null && fixtures.length > 0 && (
          <Text style={ styles.lastUpdated }>Last updated { formatLastUpdated(lastUpdated) }</Text>
        ) }
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    backgroundColor: '#0a2463',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FFD700',
  },
  tabText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#0a2463',
    textTransform: 'uppercase',
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  contentCenter: { flexGrow: 1, justifyContent: 'center', minHeight: 200 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#666', marginTop: 12 },
  emptyTitle: { color: '#111', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center' },
  errorText: { color: '#e94560', fontSize: 16, textAlign: 'center' },
  retryHint: { color: '#666', marginTop: 8, fontSize: 12 },
  retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#0a2463', borderRadius: 8 },
  retryBtnText: { color: '#FFD700', fontWeight: '600' },
  lastUpdated: { color: '#666', fontSize: 12, marginTop: 16, marginBottom: 8 },
  placeholder: { color: '#888', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  sectionBlock: { marginBottom: 28 },
  sectionTitle: {
    color: '#0a2463',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
