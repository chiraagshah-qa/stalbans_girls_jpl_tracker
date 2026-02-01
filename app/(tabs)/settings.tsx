import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';
const DIVISIONS = ['U14', 'U16'] as const;

export default function SettingsScreen() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

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
      <View style={styles.disclaimerButtonWrap}>
        <TouchableOpacity
          onPress={() => setDisclaimerVisible(true)}
          activeOpacity={0.7}
          style={styles.moreInfoLink}
        >
          <Text style={styles.moreInfoLinkText}>DISCLAIMER</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={disclaimerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDisclaimerVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDisclaimerVisible(false)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalHeader}>DISCLAIMER</Text>
            <Text style={styles.modalBody}>
              App was produced as a hobby, and is not an official app for St Albans City Academy.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setDisclaimerVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  disclaimerButtonWrap: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 24,
  },
  moreInfoLink: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#0a2463',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreInfoLinkText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  modalBody: {
    color: '#444',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalCloseBtn: {
    backgroundColor: '#0a2463',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtnText: { color: '#FFD700', fontWeight: '600' },
});
