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
import {
  scrapeGroup,
  getGroupIdForTeam,
  type ResultsData,
  type Standing,
} from '../../lib/scraper';
import { getCachedGroupData, setCachedGroupData } from '../../lib/cache';
import { getDisplayTeamName } from '../../lib/badges';
import { TeamBadge } from '../../components/TeamBadge';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';

export default function ResultsScreen() {
  const [favouriteTeam, setFavouriteTeam] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const groupId = getGroupIdForTeam(favouriteTeam);
    if (!isRefresh) {
      const cached = await getCachedGroupData(groupId);
      if (cached?.results) {
        setResults(cached.results);
        setStandings(cached.standings || []);
        setError(null);
      }
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await scrapeGroup(undefined, groupId);
      setResults(data.results);
      setStandings(data.standings);
      await setCachedGroupData(groupId, data.standings, data.results, data.fixtures);
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
  }, [favouriteTeam]);

  if (!favouriteTeam) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>No team selected</Text>
        <Text style={styles.emptyText}>Go to Settings and choose U14 or U16.</Text>
      </View>
    );
  }

  if (loading && !results) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error && !results) {
    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryHint}>Pull down to retry</Text>
      </ScrollView>
    );
  }

  const teamNames = results?.teamNames ?? [];
  const rows = results?.rows ?? [];
  const teamRow = rows.find((r) => r.teamName.includes('St Albans') && favouriteTeam && r.teamName.includes(favouriteTeam));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#FFD700" />
      }
    >
      {teamRow && (
        <>
          <View style={styles.oneTeamHeader}>
            <TeamBadge teamName={teamRow.teamName} size={40} />
            <Text style={styles.oneTeamTitle}>{getDisplayTeamName(teamRow.teamName)}</Text>
          </View>
          <View style={styles.resultsHeaderRow}>
            <Text style={[styles.resultsHeaderText, { flex: 1 }]}>Opponent</Text>
            <Text style={styles.resultsHeaderText}>Score</Text>
          </View>
          {teamNames.map((opponent, idx) => {
            if (opponent === teamRow.teamName) return null;
            const score = teamRow.cells[idx] ?? '–';
            return (
              <View key={opponent} style={styles.resultRow}>
                <View style={styles.opponentCell}>
                  <TeamBadge teamName={opponent} size={28} />
                  <Text style={styles.opponentName} numberOfLines={1}>{getDisplayTeamName(opponent)}</Text>
                </View>
                <Text style={styles.oneTeamScoreText}>{score}</Text>
              </View>
            );
          })}
        </>
      )}
      {(!results || !teamRow) && (
        <Text style={styles.emptyText}>No results matrix available.</Text>
      )}
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
  oneTeamScoreText: { color: '#333', fontSize: 14, fontWeight: '600' },
});
