import { StyleSheet, View, Text } from 'react-native';
import { TeamBadge } from './TeamBadge';
import { getDisplayTeamName } from '../lib/badges';
import { formatTimeForDisplay, type Fixture } from '../lib/scraper';

type ScheduleMatchListProps = {
  fixtures: Fixture[];
  title: string;
};

export function ScheduleMatchList({ fixtures, title }: ScheduleMatchListProps) {
  if (!fixtures.length) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.placeholder}>No fixtures</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {fixtures.map((f, i) => (
        <View key={`${f.home}-${f.away}-${i}`} style={styles.card}>
          <View style={styles.scoreRow}>
            <View style={styles.teamBlock}>
              <TeamBadge teamName={f.home} size={24} />
              <Text style={styles.teamLabel} numberOfLines={1}>{getDisplayTeamName(f.home)}</Text>
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={styles.teamBlock}>
              <TeamBadge teamName={f.away} size={24} />
              <Text style={styles.teamLabel} numberOfLines={1}>{getDisplayTeamName(f.away)}</Text>
            </View>
          </View>
          {f.played && f.score !== undefined && (
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreLabel}>{f.score}</Text>
            </View>
          )}
          <Text style={styles.dateLine}>
            {f.date}
            {f.time ? ` · ${formatTimeForDisplay(f.time)}` : ''}
          </Text>
          {f.location && (
            <Text style={styles.locationText}>{f.location}</Text>
          )}
          {f.status && (
            <View style={[styles.statusBadge, f.status === 'Rained Out' ? styles.statusDanger : f.status === 'Discipline' ? styles.statusWarning : styles.statusDefault]}>
              <Text style={[styles.statusText, f.status === 'Rained Out' ? styles.statusTextDanger : f.status === 'Discipline' ? styles.statusTextWarning : styles.statusTextDefault]}>
                {f.status}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionTitle: {
    color: '#333',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  placeholder: { color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  teamBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  teamLabel: { fontSize: 12, color: '#111', flex: 1, minWidth: 0 },
  vs: { color: '#666', fontSize: 11, fontWeight: '600' },
  scoreBlock: { alignItems: 'center', marginTop: 6 },
  scoreLabel: { fontSize: 16, fontWeight: '700', color: '#111' },
  dateLine: { fontSize: 11, color: '#666', marginTop: 4 },
  locationText: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
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
