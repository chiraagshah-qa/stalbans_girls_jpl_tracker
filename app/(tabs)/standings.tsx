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
  type Standing,
} from '../../lib/scraper';
import { getCachedGroupData, setCachedGroupData } from '../../lib/cache';
import { TeamBadge } from '../../components/TeamBadge';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';

export default function StandingsScreen() {
  const [favouriteTeam, setFavouriteTeam] = useState<string | null>(null);
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
      if (cached?.standings?.length) {
        setStandings(cached.standings);
        setError(null);
      }
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await scrapeGroup(undefined, groupId);
      setStandings(data.standings);
      await setCachedGroupData(groupId, data.standings, data.results, data.fixtures);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load standings');
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

  if (loading && standings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (error && standings.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryHint}>Pull down to retry</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#FFD700" />
      }
    >
      <View style={styles.table}>
          <View style={[styles.headerRow, styles.rowBase]}>
            <Text style={[styles.headerText, styles.colRank]}>#</Text>
            <View style={styles.colTeam} />
            <Text style={[styles.headerText, styles.colNum]}>P</Text>
            <Text style={[styles.headerText, styles.colNum]}>W</Text>
            <Text style={[styles.headerText, styles.colNum]}>D</Text>
            <Text style={[styles.headerText, styles.colNum]}>L</Text>
            <Text style={[styles.headerText, styles.colNum]}>GF</Text>
            <Text style={[styles.headerText, styles.colNum]}>GA</Text>
            <Text style={[styles.headerText, styles.colNum]}>GD</Text>
            <Text style={[styles.headerText, styles.colNum]}>PTS</Text>
          </View>
          {standings.map((row, i) => (
            <View
              key={row.name}
              style={[styles.rowBase, i % 2 === 1 && styles.rowAlt]}
            >
              <Text style={[styles.cellText, styles.colRank]}>{row.rank}</Text>
              <View style={[styles.teamCell, styles.colTeam]}>
                <TeamBadge teamName={row.name} size={28} />
              </View>
              <Text style={[styles.cellText, styles.colNum]}>{row.MP}</Text>
              <Text style={[styles.cellText, styles.colNum]}>{row.W}</Text>
              <Text style={[styles.cellText, styles.colNum]}>{row.D}</Text>
              <Text style={[styles.cellText, styles.colNum]}>{row.L}</Text>
              <Text style={[styles.cellText, styles.colNum]}>{row.GF}</Text>
              <Text style={[styles.cellText, styles.colNum]}>{row.GA}</Text>
              <Text style={[styles.cellText, styles.colNum]}>{row.GD}</Text>
              <Text style={[styles.cellText, styles.colNum]}>{row.PTS}</Text>
            </View>
          ))}
        </View>
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
  errorText: { color: '#c62828', fontSize: 16, textAlign: 'center' },
  retryHint: { color: '#666', marginTop: 8, fontSize: 12 },
  table: { backgroundColor: '#fff', width: '100%' },
  rowBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 4,
  },
  headerRow: {
    backgroundColor: '#FFFDE7',
    borderTopWidth: 2,
    borderTopColor: '#FFD700',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  rowAlt: { backgroundColor: '#fafafa' },
  headerText: { color: '#000', fontWeight: '700', fontSize: 15, textTransform: 'uppercase' },
  cellText: { color: '#000', fontSize: 12 },
  colRank: { width: 22 },
  colTeam: { width: 40 },
  colNum: { flex: 1, textAlign: 'center', minWidth: 0 },
  teamCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 0 },
});
