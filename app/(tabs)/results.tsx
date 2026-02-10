import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scrapeGroup, getTeamIdForSchedule, type ResultsData, type Fixture } from '../../lib/scraper';
import { getCachedGroupData, setCachedGroupData, getGroupIdForTeam, getTeams } from '../../lib/cache';
import { getEventId } from '../../lib/eventConfig';
import { useCrests } from '../../lib/CrestContext';
import { useDelayedError } from '../../lib/useDelayedError';
import { getDisplayTeamName } from '../../lib/badges';
import { formatLastUpdated } from '../../lib/format';
import { getHomeAwayScoresFromFixtures } from '../../lib/resultsHelpers';
import { TeamBadge } from '../../components/TeamBadge';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';

export default function ResultsScreen () {
  const [ favouriteTeam, setFavouriteTeam ] = useState<string | null>(null);
  const [ selectedTeamName, setSelectedTeamName ] = useState<string>('');
  const [ results, setResults ] = useState<ResultsData | null>(null);
  const [ fixtures, setFixtures ] = useState<Fixture[]>([]);
  const [ loading, setLoading ] = useState(true);
  const [ refreshing, setRefreshing ] = useState(false);
  const [ displayError, setError ] = useDelayedError();
  const [ lastUpdated, setLastUpdated ] = useState<number | null>(null);
  const { mergeCrests } = useCrests();

  const loadFavourite = async () => {
    try {
      const saved = await AsyncStorage.getItem(FAVOURITE_STORAGE_KEY);
      setFavouriteTeam(saved);
    } catch {
      setFavouriteTeam(null);
    }
  };

  const load = async (isRefresh = false) => {
    if (!favouriteTeam) return;
    const groupId = await getGroupIdForTeam(favouriteTeam);
    if (!groupId) {
      setError('Unable to load results for this team. Use Settings → Refresh team list and try again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const teamId = getTeamIdForSchedule(favouriteTeam);
    if (!isRefresh) {
      const cached = await getCachedGroupData(groupId);
      if (cached?.results) {
        setResults(cached.results);
        setFixtures(cached.fixtures || []);
        if (cached.updatedAt != null) setLastUpdated(cached.updatedAt);
        setError(null);
      }
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await scrapeGroup(getEventId(), groupId, teamId);
      setResults(data.results);
      setFixtures(data.fixtures);
      await setCachedGroupData(groupId, data.standings, data.results, data.fixtures, data.leagueName);
      if (data.crests?.length) await mergeCrests(data.crests);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load results');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(() => {
    loadFavourite();
  });

  useEffect(() => {
    if (favouriteTeam) load();
  }, [ favouriteTeam ]);

  useEffect(() => {
    if (!favouriteTeam) return;
    getTeams().then((teams) => {
      const t = teams.find((x) => x.teamId === favouriteTeam);
      setSelectedTeamName(t?.name ?? '');
    });
  }, [ favouriteTeam ]);

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

  if (loading && !results) {
    return (
      <View style={ styles.centerContainer }>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={ styles.loadingText } accessibilityLiveRegion="polite">
          Loading…
        </Text>
      </View>
    );
  }

  if (displayError && !results) {
    return (
      <ScrollView contentContainerStyle={ styles.centerContainer }>
        <Text
          style={ styles.errorText }
          accessibilityLiveRegion="polite"
        >
          { displayError }
        </Text>
        <Text style={ styles.retryHint }>Pull down to retry</Text>
      </ScrollView>
    );
  }

  const teamNames = results?.teamNames ?? [];
  const rows = results?.rows ?? [];
  const teamRow = rows.find(
    (r) =>
      selectedTeamName &&
      (r.teamName === selectedTeamName ||
        r.teamName.includes(selectedTeamName) ||
        selectedTeamName.includes(r.teamName))
  ) ?? rows.find((r) => r.teamName.includes('St Albans'));
  const ourTeamName = teamRow?.teamName ?? selectedTeamName;

  /** Home/Away scores from fixtures page only (fixture.home/away/score give correct column). */
  function getHomeAwayScores (opponent: string): { homeScore: string; awayScore: string } {
    return getHomeAwayScoresFromFixtures(fixtures, ourTeamName, opponent);
  }

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ styles.content }
      refreshControl={
        <RefreshControl refreshing={ refreshing } onRefresh={ () => load(true) } tintColor="#FFD700" />
      }
    >
      { teamRow && (
        <>
          <View style={ styles.oneTeamHeader }>
            <TeamBadge teamName={ teamRow.teamName } size={ 40 } />
            <Text style={ styles.oneTeamTitle }>{ getDisplayTeamName(teamRow.teamName) }</Text>
          </View>
          <View style={ styles.resultsHeaderRow }>
            <Text style={ [ styles.resultsHeaderText, styles.opponentCol ] }>Opponent</Text>
            <Text style={ [ styles.resultsHeaderText, styles.homeCol ] }>Home</Text>
            <Text style={ [ styles.resultsHeaderText, styles.awayCol ] }>Away</Text>
          </View>
          { teamNames.map((opponent) => {
            if (opponent === teamRow.teamName) return null;
            const { homeScore, awayScore } = getHomeAwayScores(opponent);
            const opponentLabel = getDisplayTeamName(opponent);
            return (
              <View
                key={ opponent }
                style={ styles.resultRow }
                accessible
                accessibilityRole="summary"
                accessibilityLabel={ `Opponent: ${ opponentLabel }. Home: ${ homeScore }. Away: ${ awayScore }.` }
              >
                <View style={ styles.opponentCell } accessible={ false }>
                  <TeamBadge teamName={ opponent } size={ 28 } />
                  <Text style={ styles.opponentName }>{ opponentLabel }</Text>
                </View>
                <Text style={ [ styles.scoreCell, styles.homeCol ] } accessible={ false }>{ homeScore }</Text>
                <Text style={ [ styles.scoreCell, styles.awayCol ] } accessible={ false }>{ awayScore }</Text>
              </View>
            );
          }) }
        </>
      ) }
      { (!results || !teamRow) && (
        <Text style={ styles.emptyText }>No results matrix available.</Text>
      ) }
      { lastUpdated != null && (results && teamRow) && (
        <Text style={ styles.lastUpdated }>Last updated { formatLastUpdated(lastUpdated) }</Text>
      ) }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 24 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { color: '#111', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  loadingText: { color: '#666', marginTop: 12 },
  errorText: { color: '#e94560', fontSize: 16, textAlign: 'center' },
  retryHint: { color: '#666', marginTop: 8, fontSize: 12 },
  oneTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  oneTeamTitle: { color: '#111', fontSize: 16, fontWeight: '700', flex: 1, minWidth: 0 },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#FFD700',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
    gap: 8,
  },
  resultsHeaderText: { color: '#111', fontWeight: '700', fontSize: 15, textTransform: 'uppercase' },
  opponentCol: { flex: 1, minWidth: 0 },
  homeCol: { minWidth: 52, width: 52, textAlign: 'center' },
  awayCol: { minWidth: 52, width: 52, textAlign: 'center' },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  opponentCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  opponentName: { color: '#111', fontSize: 14, flex: 1, minWidth: 0 },
  scoreCell: { color: '#333', fontSize: 14, fontWeight: '600' },
  lastUpdated: { color: '#666', fontSize: 12, marginTop: 16, marginBottom: 8 },
});
