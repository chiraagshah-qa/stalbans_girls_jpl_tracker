import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';
const DIVISIONS = ['U14', 'U16'] as const;

export default function SettingsScreen() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const loadSavedTeam = async () => {
    try {
      const saved = await AsyncStorage.getItem(FAVOURITE_STORAGE_KEY);
      setSelectedTeam(saved);
    } catch {
      setSelectedTeam(null);
    }
  };

  useFocusEffect(() => {
    loadSavedTeam();
  });

  const saveTeam = async (division: string) => {
    try {
      await AsyncStorage.setItem(FAVOURITE_STORAGE_KEY, division);
      setSelectedTeam(division);
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, styles.contentGrow]}>
      <Text style={styles.sectionTitle}>Team</Text>
      <Text style={styles.subtitle}>
        Choose your team (age group) to follow across the app.
      </Text>
      <View style={styles.divisionRow}>
        {DIVISIONS.map((div) => {
          const isSelected = selectedTeam === div;
          return (
            <TouchableOpacity
              key={div}
              style={[
                styles.divisionOption,
                isSelected && styles.divisionOptionSelected,
              ]}
              onPress={() => saveTeam(div)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.divisionOptionText,
                  isSelected && styles.divisionOptionTextSelected,
                ]}
              >
                {div}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.disclaimerSpacer} />
      <Text style={styles.disclaimer}>
        This app is in development and it's not official.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 24 },
  contentGrow: { flexGrow: 1 },
  disclaimerSpacer: { flexGrow: 1, minHeight: 24 },
  sectionTitle: { color: '#111', fontSize: 25, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  subtitle: { color: '#666', fontSize: 14, marginBottom: 16 },
  divisionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  divisionOption: {
    flex: 1,
    backgroundColor: '#0a2463',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  divisionOptionSelected: {
    backgroundColor: '#FFD700',
  },
  divisionOptionText: { color: '#FFD700', fontSize: 20, fontWeight: '700' },
  divisionOptionTextSelected: { color: '#0a2463' },
  disclaimer: {
    color: '#888',
    fontSize: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
