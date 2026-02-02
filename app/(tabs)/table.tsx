import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scrapeGroup,
  getGroupIdForTeam,
  type Standing,
} from '../../lib/scraper';
import { getCachedGroupData, setCachedGroupData } from '../../lib/cache';
import { getDisplayTeamName } from '../../lib/badges';
import { TeamBadge } from '../../components/TeamBadge';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';

function formatLastUpdated (ms: number): string {
  const d = new Date(ms);
  const day = d.getDate();
  const month = d.toLocaleString('en-GB', { month: 'long' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${ day }${ day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th' } ${ month } ${ year } at ${ time }`;
}

function getDivisionTitle (teamName: string | null): string {
  if (!teamName) return '';
  return teamName.includes('U16') ? 'U16s' : 'U14s';
}

export default function TableScreen () {
  const [ favouriteTeam, setFavouriteTeam ] = useState<string | null>(null);
  const [ standings, setStandings ] = useState<Standing[]>([]);
  const [ leagueName, setLeagueName ] = useState<string | null>(null);
  const [ lastUpdated, setLastUpdated ] = useState<number | null>(null);
  const [ loading, setLoading ] = useState(true);
  const [ refreshing, setRefreshing ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

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
        if (cached.leagueName) setLeagueName(cached.leagueName);
        if (cached.updatedAt != null) setLastUpdated(cached.updatedAt);
        setError(null);
      }
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await scrapeGroup(undefined, groupId);
      setStandings(data.standings);
      setLeagueName(data.leagueName || null);
      await setCachedGroupData(groupId, data.standings, data.results, data.fixtures, data.leagueName);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load table');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const navigation = useNavigation();

  useFocusEffect(() => {
    loadFavourite();
  });

  useEffect(() => {
    if (favouriteTeam) load();
  }, [ favouriteTeam ]);

  useEffect(() => {
    const title = leagueName
      ? `Table: ${ leagueName }`
      : favouriteTeam
        ? `Table: ${ getDivisionTitle(favouriteTeam) }`
        : 'Table';
    navigation.setOptions({ title });
  }, [ favouriteTeam, leagueName, navigation ]);

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
      <ScrollView contentContainerStyle={ styles.centerContainer }>
        <Text
          style={ styles.errorText }
          accessibilityLiveRegion="polite"
        >
          { error }
        </Text>
        <Text style={ styles.retryHint }>Pull down to retry</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={ styles.container }
      contentContainerStyle={ styles.content }
      refreshControl={
        <RefreshControl refreshing={ refreshing } onRefresh={ () => load(true) } tintColor="#FFD700" />
      }
    >
      <View style={ styles.tableWrapper }>
        <View style={ styles.tableFixed }>
          <View style={ [ styles.rowBase, styles.rowFixed, styles.headerRow ] }>
            <View style={ styles.colRank } />
            <Text style={ [ styles.headerText, styles.colTeam ] }>Team</Text>
          </View>
          { standings.map((row) => (
            <View
              key={ row.name }
              style={ [ styles.rowBase, styles.rowFixed ] }
              accessible
              accessibilityRole="summary"
              accessibilityLabel={ `Position ${ row.rank }. ${ getDisplayTeamName(row.name) }. Played ${ row.MP }. Goal difference ${ row.GD }. ${ row.PTS } points. ${ row.W } wins. ${ row.D } draws. ${ row.L } losses. ${ row.GF } goals for. ${ row.GA } goals against.` }
            >
              <Text style={ [ styles.cellText, styles.colRank ] } accessible={ false }>{ row.rank }</Text>
              <View style={ [ styles.teamCell, styles.colTeam ] } accessible={ false }>
                <TeamBadge teamName={ row.name } size={ 28 } />
                <Text style={ styles.teamName } numberOfLines={ 2 }>{ getDisplayTeamName(row.name) }</Text>
              </View>
            </View>
          )) }
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={ false }
          style={ styles.tableScroll }
          contentContainerStyle={ styles.tableScrollContent }
        >
          <View style={ styles.tableScrollInner }>
            <View style={ [ styles.rowBase, styles.rowScroll, styles.headerRow ] }>
              <Text style={ [ styles.headerText, styles.colNum ] }>P</Text>
              <Text style={ [ styles.headerText, styles.colNum ] }>GD</Text>
              <Text style={ [ styles.headerText, styles.colNum ] }>Pts</Text>
              <Text style={ [ styles.headerText, styles.colNum ] }>W</Text>
              <Text style={ [ styles.headerText, styles.colNum ] }>D</Text>
              <Text style={ [ styles.headerText, styles.colNum ] }>L</Text>
              <Text style={ [ styles.headerText, styles.colNum ] }>GF</Text>
              <Text style={ [ styles.headerText, styles.colNum ] }>GA</Text>
            </View>
            { standings.map((row) => (
              <View
                key={ row.name }
                style={ [ styles.rowBase, styles.rowScroll ] }
                accessible={ false }
              >
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.MP }</Text>
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.GD }</Text>
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.PTS }</Text>
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.W }</Text>
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.D }</Text>
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.L }</Text>
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.GF }</Text>
                <Text style={ [ styles.cellText, styles.colNum ] }>{ row.GA }</Text>
              </View>
            )) }
          </View>
        </ScrollView>
      </View>

      { lastUpdated != null && (
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
  errorText: { color: '#c62828', fontSize: 16, textAlign: 'center' },
  retryHint: { color: '#666', marginTop: 8, fontSize: 12 },
  tableWrapper: { flexDirection: 'row', backgroundColor: '#fff' },
  tableFixed: {
    width: 242,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    backgroundColor: '#fff',
  },
  tableScroll: { flex: 1 },
  tableScrollContent: { minWidth: 208 },
  tableScrollInner: { flexDirection: 'column', minWidth: 208 },
  rowBase: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    gap: 4,
  },
  rowFixed: { width: 242, height: 56 },
  rowScroll: { minWidth: 208, height: 56 },
  headerRow: {
    backgroundColor: '#f5f5f5',
    borderTopWidth: 2,
    borderTopColor: '#111',
    borderBottomWidth: 2,
    borderBottomColor: '#111',
    height: 40,
    minHeight: 40,
    paddingVertical: 6,
  },
  headerText: { color: '#000', fontWeight: '700', fontSize: 13, textTransform: 'uppercase' },
  cellText: { color: '#000', fontSize: 13 },
  colRank: { width: 22 },
  colTeam: { width: 200 },
  colNum: { width: 26, textAlign: 'center' },
  teamCell: { flexDirection: 'row', alignItems: 'center', width: 200, gap: 8 },
  teamName: { color: '#000', fontSize: 14, fontWeight: '500', flex: 1, minWidth: 0 },
  lastUpdated: { color: '#666', fontSize: 12, marginTop: 12, marginBottom: 8 },
});
