import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scrapeGroup,
  scrapeFixtures,
  getGroupIdForTeam,
  getStAlbansTeamInDivision,
  formatTimeForDisplay,
  parseFixtureDate,
  type Standing,
  type Fixture,
} from '../../lib/scraper';
import { getCachedGroupData, setCachedGroupData } from '../../lib/cache';
import { getDisplayTeamName } from '../../lib/badges';
import { setAccessibilityFocus, announceForAccessibility } from '../../lib/accessibility';
import { TeamBadge } from '../../components/TeamBadge';
import { ScheduleMatchList } from '../../components/ScheduleMatchList';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';
const LOGO_SIZE = 64;
const DIVISIONS = [ 'U14', 'U16' ] as const;

function isTeamInFixture (fixture: Fixture, teamName: string, division: string | null): boolean {
  if (!teamName) return false;
  const home = fixture.home.trim();
  const away = fixture.away.trim();
  const exactMatch =
    home === teamName ||
    away === teamName ||
    home.includes(teamName) ||
    away.includes(teamName) ||
    teamName.includes(home) ||
    teamName.includes(away);
  if (exactMatch) return true;
  if (!division) return false;
  const hasStAlbans = (s: string) => /st\s*albans/i.test(s);
  const hasDivision = (s: string) => s.includes(division);
  return (
    (hasStAlbans(home) && hasDivision(home)) ||
    (hasStAlbans(away) && hasDivision(away))
  );
}

function isRainedOut (f: Fixture): boolean {
  const s = [ f.status, f.time ].filter(Boolean).join(' ');
  return /rained\s*out/i.test(s);
}

function isDiscipline (f: Fixture): boolean {
  return /discipline/i.test(f.status || '');
}

/** True if fixture was cancelled, postponed, or abandoned (so it counts as a "result" for last result). */
function isCancelledOrAbandoned (f: Fixture): boolean {
  return /cancelled|canceled|postponed|abandoned/i.test(f.status || '');
}

/** Whether fixture has a resolvable outcome (score, played, rained out, discipline, or cancelled/postponed). */
function hasResultOrOutcome (f: Fixture): boolean {
  return !!(f.score || f.played || isRainedOut(f) || isDiscipline(f) || isCancelledOrAbandoned(f));
}

/** Label for last result tile when there is no score (e.g. Rained out, Cancelled). */
function getLastResultOutcomeLabel (f: Fixture): string {
  if (isRainedOut(f)) return 'RAINED OUT';
  if (isDiscipline(f)) return 'DISCIPLINE';
  if (/cancelled|canceled/i.test(f.status || '')) return 'CANCELLED';
  if (/postponed/i.test(f.status || '')) return 'POSTPONED';
  if (/abandoned/i.test(f.status || '')) return 'ABANDONED';
  return (f.status || '').trim() || '–';
}

function formatPosition (rank: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${ rank }th`;
}

export default function LandingScreen () {
  const [ hydrating, setHydrating ] = useState(true);
  const [ favouriteTeam, setFavouriteTeam ] = useState<string | null>(null);
  const [ standings, setStandings ] = useState<Standing[]>([]);
  const [ fixtures, setFixtures ] = useState<Fixture[]>([]);
  const [ loading, setLoading ] = useState(true);
  const [ refreshing, setRefreshing ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

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
      if (cached?.standings) {
        setStandings(cached.standings);
        setError(null);
        hadCache = true;
      }
    }
    if (isRefresh) setRefreshing(true);
    else if (!hadCache) setLoading(true);
    setError(null);
    try {
      const [ groupData, fixturesData ] = await Promise.all([
        scrapeGroup(undefined, groupId),
        scrapeFixtures(undefined, groupId),
      ]);
      setStandings(groupData.standings);
      setFixtures(fixturesData);
      await setCachedGroupData(groupId, groupData.standings, groupData.results, fixturesData, groupData.leagueName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const appState = useRef(AppState.currentState);
  const mainContentRef = useRef<View>(null);
  const prevFavouriteRef = useRef<string | null>(null);

  useFocusEffect(() => {
    loadFavourite();
  });

  useEffect(() => {
    if (favouriteTeam) loadData();
  }, [ favouriteTeam ]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active' && favouriteTeam) {
        loadData(true);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [ favouriteTeam ]);

  useEffect(() => {
    if (prevFavouriteRef.current === null && favouriteTeam != null) {
      prevFavouriteRef.current = favouriteTeam;
      const t = setTimeout(() => {
        setAccessibilityFocus(mainContentRef);
        announceForAccessibility(`Home. ${ favouriteTeam } selected.`);
      }, 250);
      return () => clearTimeout(t);
    }
    prevFavouriteRef.current = favouriteTeam;
  }, [ favouriteTeam ]);

  const saveFavourite = async (division: string) => {
    try {
      await AsyncStorage.setItem(FAVOURITE_STORAGE_KEY, division);
      setFavouriteTeam(division);
    } catch { }
  };

  if (hydrating) {
    return (
      <View style={ styles.centerContainer }>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={ styles.loadingText } accessibilityLiveRegion="polite">
          Loading…
        </Text>
      </View>
    );
  }

  if (!favouriteTeam) {
    return (
      <ScrollView style={ styles.container } contentContainerStyle={ styles.pickScroll }>
        <View style={ styles.pickBlock }>
          <Text style={ styles.pickTitle }>Choose your team</Text>
          <Text style={ styles.pickSubtitle }>
            Select your age group to see table and fixtures.
          </Text>
          <View style={ styles.divisionRow }>
            { DIVISIONS.map((div) => (
              <TouchableOpacity
                key={ div }
                style={ styles.divisionOption }
                onPress={ () => saveFavourite(div) }
                activeOpacity={ 0.7 }
                accessibilityRole="button"
                accessibilityLabel={ `Select ${ div } team` }
              >
                <Text style={ styles.divisionOptionText }>{ div }</Text>
              </TouchableOpacity>
            )) }
          </View>
        </View>
      </ScrollView>
    );
  }

  const groupId = getGroupIdForTeam(favouriteTeam);
  const badgeTeamName = getStAlbansTeamInDivision(standings, favouriteTeam) || favouriteTeam;
  const myStanding = standings.find(
    (s) => s.name.includes('St Albans') && s.name.includes(favouriteTeam)
  );
  const oneDay = 24 * 60 * 60 * 1000;
  const parseDate = (f: Fixture): number => {
    const t = parseFixtureDate(f);
    if (!isNaN(t)) return t;
    if (f.date && f.date !== 'TBD') {
      const d = new Date(f.date.replace(/\s*,?\s*/, ' ').replace(/\s+/g, ' ').trim());
      return isNaN(d.getTime()) ? NaN : d.getTime();
    }
    return NaN;
  };
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const todayEnd = todayStartMs + oneDay;
  const fixturesWithDate = fixtures.filter((f) => !isNaN(parseDate(f)));
  const fixturesAsc = [ ...fixturesWithDate ].sort(
    (a, b) => parseDate(a) - parseDate(b)
  );
  const allForTeam =
    fixtures.filter((f) =>
      isTeamInFixture(f, badgeTeamName, favouriteTeam)
    ).length > 0
      ? fixtures.filter((f) =>
        isTeamInFixture(f, badgeTeamName, favouriteTeam)
      )
      : fixtures.filter(
        (f) =>
          (f.home && f.home.includes(favouriteTeam)) ||
          (f.away && f.away.includes(favouriteTeam))
      );
  const forTeamAsc = [ ...allForTeam ].sort((a, b) => {
    const ta = parseDate(a);
    const tb = parseDate(b);
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return ta - tb;
  });
  const isPast = (f: Fixture) =>
    parseDate(f) < todayStartMs ||
    isRainedOut(f) ||
    isDiscipline(f) ||
    isCancelledOrAbandoned(f);
  const nextFixture =
    forTeamAsc.find((f) => !isRainedOut(f) && !isDiscipline(f) && parseDate(f) >= todayStartMs) ??
    forTeamAsc.find((f) => !isRainedOut(f) && !isDiscipline(f) && !f.score && !f.played) ??
    null;
  const pastWithResult = allForTeam.filter(
    (f) => isPast(f) && hasResultOrOutcome(f)
  );
  /** Pick the most recent past fixture (by date). When no valid dates, use last in list (assumes list is oldest-first). */
  const mostRecentPast = (list: Fixture[]): Fixture | null => {
    if (list.length === 0) return null;
    const withValidDate = list.filter((f) => !isNaN(parseDate(f)));
    if (withValidDate.length === 0) return list[ list.length - 1 ];
    const byDateDesc = [ ...withValidDate ].sort((a, b) => parseDate(b) - parseDate(a));
    return byDateDesc[ 0 ];
  };
  const lastResult =
    mostRecentPast(pastWithResult) ??
    mostRecentPast(allForTeam.filter(hasResultOrOutcome)) ??
    mostRecentPast(allForTeam.filter(isPast));
  const todayFixtures = fixturesAsc.filter((f) => {
    const t = parseDate(f);
    return t >= todayStartMs && t < todayEnd;
  });
  const futureFixtures = fixturesAsc.filter((f) => parseDate(f) >= todayStartMs);
  const displayFixtures =
    todayFixtures.length > 0 ? todayFixtures : futureFixtures.slice(0, 5);

  if (loading && standings.length === 0) {
    return (
      <View style={ styles.centerContainer }>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={ styles.loadingText } accessibilityLiveRegion="polite">
          Loading…
        </Text>
      </View>
    );
  }

  if (error && standings.length === 0) {
    return (
      <ScrollView style={ styles.container } contentContainerStyle={ styles.centerContainer }>
        <Text
          style={ styles.errorText }
          accessibilityLiveRegion="polite"
        >
          { error }
        </Text>
        <Text style={ styles.retryHint }>Pull down to retry</Text>
        <TouchableOpacity
          style={ styles.retryBtn }
          onPress={ () => loadData(true) }
          accessibilityRole="button"
          accessibilityLabel="Retry loading data"
          accessibilityHint="Loads data again from the server"
        >
          <Text style={ styles.retryBtnText }>
            Retry
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!loading && !error && standings.length === 0 && fixtures.length === 0) {
    return (
      <ScrollView style={ styles.container } contentContainerStyle={ styles.centerContainer }>
        <Text style={ styles.emptyTitle }>No data loaded</Text>
        <Text style={ styles.emptyText }>Pull down to refresh from GotSport.</Text>
        <TouchableOpacity
          style={ styles.retryBtn }
          onPress={ () => loadData(true) }
          accessibilityRole="button"
          accessibilityLabel="Retry loading data"
          accessibilityHint="Loads data again from the server"
        >
          <Text style={ styles.retryBtnText }>
            Retry
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ styles.content }
      refreshControl={
        <RefreshControl refreshing={ refreshing } onRefresh={ () => loadData(true) } />
      }
    >
      <View
        ref={ mainContentRef }
        style={ styles.logoBlock }
        accessible
        accessibilityLabel={ `Home. Team: ${ favouriteTeam }.` }
      >
        <TeamBadge teamName={ badgeTeamName } size={ LOGO_SIZE } />
        { favouriteTeam && (
          <Text style={ styles.ageGroupLabel }>{ favouriteTeam }</Text>
        ) }
      </View>
      { myStanding && (
        <View
          style={ styles.positionCard }
          accessible
          accessibilityRole="summary"
          accessibilityLabel={ `League position: ${ formatPosition(myStanding.rank) }. ${ myStanding.PTS } points. Goal difference ${ myStanding.GD >= 0 ? 'plus' : '' } ${ myStanding.GD }.` }
        >
          <Text style={ styles.positionLabel } accessible={ false }>LEAGUE POSITION:</Text>
          <Text style={ styles.positionValue } accessible={ false }>{ formatPosition(myStanding.rank) }</Text>
          <Text style={ styles.positionData } accessible={ false }>
            { myStanding.PTS } pts · GD { myStanding.GD >= 0 ? '+' : '' }{ myStanding.GD }
          </Text>
        </View>
      ) }
      <View
        style={ styles.tile }
        accessible
        accessibilityRole="summary"
        accessibilityLabel={
          lastResult
            ? `Last result. ${ getDisplayTeamName(lastResult.home) } versus ${ getDisplayTeamName(lastResult.away) }. ${ lastResult.score ?? getLastResultOutcomeLabel(lastResult) }. ${ lastResult.date }${ lastResult.time ? ` at ${ formatTimeForDisplay(lastResult.time) }` : '' }.`
            : 'Last result. No recent result.'
        }
      >
        <Text style={ styles.tileTitle } accessible={ false }>LAST RESULT:</Text>
        { lastResult ? (
          <>
            <View style={ styles.tileRow } accessible={ false }>
              <TeamBadge teamName={ lastResult.home } size={ 32 } />
              <Text style={ styles.tileTeamLabel } numberOfLines={ 1 }>{ getDisplayTeamName(lastResult.home) }</Text>
            </View>
            <Text
              style={ [
                styles.tileScore,
                isRainedOut(lastResult) && !lastResult.score && styles.tileScoreRainedOut,
                isDiscipline(lastResult) && !lastResult.score && styles.tileScoreDiscipline,
              ] }
              accessible={ false }
            >
              { lastResult.score ?? getLastResultOutcomeLabel(lastResult) }
            </Text>
            <View style={ styles.tileRow } accessible={ false }>
              <TeamBadge teamName={ lastResult.away } size={ 32 } />
              <Text style={ styles.tileTeamLabel } numberOfLines={ 1 }>{ getDisplayTeamName(lastResult.away) }</Text>
            </View>
            <Text style={ styles.tileMeta } accessible={ false }>{ lastResult.date }{ lastResult.time ? ` · ${ formatTimeForDisplay(lastResult.time) }` : '' }</Text>
          </>
        ) : (
          <Text style={ styles.tilePlaceholder } accessible={ false }>No recent result</Text>
        ) }
      </View>
      <View
        style={ styles.tile }
        accessible
        accessibilityRole="summary"
        accessibilityLabel={
          nextFixture
            ? `Next fixture. ${ getDisplayTeamName(nextFixture.home) } versus ${ getDisplayTeamName(nextFixture.away) }. ${ nextFixture.date }${ nextFixture.time ? ` at ${ formatTimeForDisplay(nextFixture.time) }` : '' }. ${ nextFixture.location ? ` ${ nextFixture.location }.` : '' }`
            : 'Next fixture. No upcoming fixture.'
        }
      >
        <Text style={ styles.tileTitle } accessible={ false }>NEXT FIXTURE:</Text>
        { nextFixture ? (
          <>
            <View style={ styles.tileRow } accessible={ false }>
              <TeamBadge teamName={ nextFixture.home } size={ 32 } />
              <Text style={ styles.tileTeamLabel } numberOfLines={ 1 }>{ getDisplayTeamName(nextFixture.home) }</Text>
            </View>
            <Text style={ styles.tileVs } accessibilityLabel="versus" accessible={ false }>vs</Text>
            <View style={ styles.tileRow } accessible={ false }>
              <TeamBadge teamName={ nextFixture.away } size={ 32 } />
              <Text style={ styles.tileTeamLabel } numberOfLines={ 1 }>{ getDisplayTeamName(nextFixture.away) }</Text>
            </View>
            <Text style={ styles.tileMeta } accessible={ false }>{ nextFixture.date }{ nextFixture.time ? ` · ${ formatTimeForDisplay(nextFixture.time) }` : '' }</Text>
            { nextFixture.location && <Text style={ styles.tileLocation } accessible={ false }>{ nextFixture.location }</Text> }
          </>
        ) : (
          <Text style={ styles.tilePlaceholder } accessible={ false }>No upcoming fixture</Text>
        ) }
      </View>
      { displayFixtures.length > 0 && (
        <ScheduleMatchList
          fixtures={ displayFixtures }
          title={ todayFixtures.length > 0 ? "Today's fixtures" : 'Upcoming' }
        />
      ) }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  pickScroll: { flex: 1, padding: 24, paddingTop: 32, alignItems: 'center' },
  pickBlock: { width: '100%', maxWidth: 320 },
  pickTitle: { color: '#111', fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  pickSubtitle: { color: '#666', fontSize: 15, textAlign: 'center', marginBottom: 28, paddingHorizontal: 16 },
  divisionRow: { flexDirection: 'row', gap: 12 },
  divisionOption: {
    flex: 1,
    backgroundColor: '#0a2463',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  divisionOptionText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  loadingText: { color: '#666', marginTop: 12 },
  emptyTitle: { color: '#111', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center' },
  errorText: { color: '#e94560', fontSize: 16, textAlign: 'center' },
  retryHint: { color: '#666', marginTop: 8, fontSize: 12 },
  retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#0a2463', borderRadius: 8 },
  retryBtnText: { color: '#FFD700', fontWeight: '600' },
  logoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  ageGroupLabel: {
    color: '#0a2463',
    fontSize: 48,
    fontWeight: '700',
  },
  positionCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  positionLabel: { color: '#666', fontSize: 15, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
  positionValue: { color: '#111', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  positionData: { color: '#111', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  tile: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  tileTitle: { color: '#666', fontSize: 15, marginBottom: 10, textAlign: 'center', textTransform: 'uppercase' },
  tileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 },
  tileTeamLabel: { color: '#111', fontSize: 14, textAlign: 'center', maxWidth: '80%' },
  tileScore: { color: '#111', fontSize: 20, fontWeight: '700', textAlign: 'center', marginVertical: 6 },
  tileScoreRainedOut: { color: '#c0392b', textTransform: 'uppercase' },
  tileScoreDiscipline: { color: '#856404', textTransform: 'uppercase' },
  tileVs: { color: '#666', fontSize: 12, textAlign: 'center', marginVertical: 2 },
  tileMeta: { color: '#666', fontSize: 12, marginTop: 8, textAlign: 'center' },
  tileLocation: { color: '#888', fontSize: 11, marginTop: 4, textAlign: 'center' },
  tilePlaceholder: { color: '#888', fontSize: 14, textAlign: 'center', paddingVertical: 12 },
});
