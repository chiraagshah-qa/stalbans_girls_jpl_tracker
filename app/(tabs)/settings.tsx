import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAccessibilityFocus } from '../../lib/accessibility';
import { getTeams, setCachedTeams } from '../../lib/cache';
import { getEventId } from '../../lib/eventConfig';
import type { ClubTeam } from '../../lib/scraper';
import { getAgeGroupDisplayName } from '../../lib/scraper';

const FAVOURITE_STORAGE_KEY = 'gotsport_favourite_team';

export default function SettingsScreen () {
  const [ teams, setTeamsState ] = useState<ClubTeam[]>([]);
  const [ teamsLoading, setTeamsLoading ] = useState(true);
  const [ selectedTeam, setSelectedTeam ] = useState<string | null>(null);
  const [ disclaimerVisible, setDisclaimerVisible ] = useState(false);
  const disclaimerButtonRef = useRef<View>(null);
  const modalCloseButtonRef = useRef<View>(null);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const loadTeams = useCallback(async (isRefresh = false) => {
    if (isRefresh) setTeamsLoading(true);
    try {
      const list = await getTeams();
      setTeamsState(list);
    } catch {
      setTeamsState([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const loadSavedTeam = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(FAVOURITE_STORAGE_KEY);
      setSelectedTeam(saved);
    } catch {
      setSelectedTeam(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedTeam();
      loadTeams();
    }, [ loadSavedTeam, loadTeams ])
  );

  const prevModalVisibleRef = useRef(false);
  useEffect(() => {
    if (disclaimerVisible) {
      prevModalVisibleRef.current = true;
      const t = setTimeout(() => setAccessibilityFocus(modalCloseButtonRef), 200);
      return () => clearTimeout(t);
    }
    if (prevModalVisibleRef.current) {
      prevModalVisibleRef.current = false;
      const t = setTimeout(() => setAccessibilityFocus(disclaimerButtonRef), 150);
      return () => clearTimeout(t);
    }
  }, [ disclaimerVisible ]);

  const saveTeam = async (team: ClubTeam) => {
    try {
      await AsyncStorage.setItem(FAVOURITE_STORAGE_KEY, team.teamId);
      setSelectedTeam(team.teamId);
    } catch { }
  };

  const refreshTeams = async () => {
    setTeamsLoading(true);
    try {
      const { fetchClubsPage, parseClubsPage } = await import('../../lib/scraper');
      const html = await fetchClubsPage(getEventId());
      const list = parseClubsPage(html);
      if (list.length) await setCachedTeams(list);
      setTeamsState(list);
    } catch {
      setTeamsState([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const openAccessibilitySettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
      } else {
        await Linking.openSettings();
      }
    } catch {
      const message =
        Platform.OS === 'ios'
          ? 'To use VoiceOver or other accessibility features, open the Settings app, then go to Accessibility.'
          : 'To use TalkBack or other accessibility features, open Settings, then go to Accessibility.';
      Alert.alert('Turn on accessibility', message, [ { text: 'OK' } ]);
    }
  };

  return (
    <ScrollView style={ styles.container } contentContainerStyle={ [ styles.content, styles.contentGrow ] }>
      <Text style={ styles.sectionTitle }>Team</Text>
      <Text style={ styles.subtitle }>
        Choose your team (age group) to follow across the app. Teams are loaded from GotSport.
      </Text>
      { teamsLoading && teams.length === 0 ? (
        <View style={ styles.teamsLoading }>
          <ActivityIndicator size="small" color="#0a2463" />
          <Text style={ styles.teamsLoadingText }>Loading teams…</Text>
        </View>
      ) : teams.length === 0 ? (
        <View style={ styles.teamsEmpty }>
          <Text style={ styles.teamsEmptyText }>No teams found. Check connection and try again.</Text>
          <TouchableOpacity
            onPress={ refreshTeams }
            style={ styles.refreshButton }
            accessibilityRole="button"
            accessibilityLabel="Refresh team list"
          >
            <Text style={ styles.refreshButtonText }>Refresh team list</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={ styles.divisionRow }>
            { teams.map((team) => {
              const isSelected = selectedTeam === team.teamId;
              const label = getAgeGroupDisplayName(team);
              return (
                <TouchableOpacity
                  key={ team.teamId }
                  style={ [
                    styles.divisionOption,
                    isSelected && styles.divisionOptionSelected,
                  ] }
                  onPress={ () => saveTeam(team) }
                  activeOpacity={ 0.7 }
                  accessibilityRole="button"
                  accessibilityLabel={ `Select ${ label }` }
                  accessibilityState={ { selected: isSelected } }
                >
                  <Text
                    style={ [
                      styles.divisionOptionText,
                      isSelected && styles.divisionOptionTextSelected,
                    ] }
                    numberOfLines={ 1 }
                  >
                    { label }
                  </Text>
                </TouchableOpacity>
              );
            }) }
          </View>
          <TouchableOpacity
            onPress={ refreshTeams }
            disabled={ teamsLoading }
            style={ styles.refreshLink }
            accessibilityRole="button"
            accessibilityLabel="Refresh team list from GotSport"
          >
            <Text style={ styles.refreshLinkText }>
              { teamsLoading ? 'Refreshing…' : 'Refresh team list' }
            </Text>
          </TouchableOpacity>
        </>
      ) }
      <View style={ styles.accessibilitySection }>
        <Text style={ styles.sectionTitle }>Accessibility</Text>
        <Text style={ styles.subtitle }>
          Use a screen reader (VoiceOver or TalkBack) for spoken feedback. Open device settings to turn it on.
        </Text>
        <TouchableOpacity
          onPress={ openAccessibilitySettings }
          activeOpacity={ 0.7 }
          style={ styles.accessibilityOption }
          accessibilityRole="button"
          accessibilityLabel="Open accessibility settings"
          accessibilityHint="Opens device settings to turn on screen reader"
        >
          <Text style={ styles.accessibilityOptionText }>Turn On Accessibility</Text>
        </TouchableOpacity>
      </View>
      <View style={ styles.disclaimerSpacer } />
      <View style={ styles.disclaimerButtonWrap } ref={ disclaimerButtonRef } collapsable={ false }>
        <TouchableOpacity
          onPress={ () => setDisclaimerVisible(true) }
          activeOpacity={ 0.7 }
          style={ styles.moreInfoLink }
          accessibilityRole="button"
          accessibilityLabel="Open disclaimer"
          accessibilityHint="Opens disclaimer dialog"
        >
          <Text style={ styles.moreInfoLinkText }>DISCLAIMER</Text>
        </TouchableOpacity>
        <Text style={ styles.versionText } accessibilityLabel={ `App version ${ appVersion }` }>
          Version { appVersion }
        </Text>
      </View>
      <Modal
        visible={ disclaimerVisible }
        transparent
        animationType="fade"
        onRequestClose={ () => setDisclaimerVisible(false) }
      >
        <Pressable
          style={ styles.modalBackdrop }
          onPress={ () => setDisclaimerVisible(false) }
          accessibilityViewIsModal={ false }
        >
          <Pressable
            style={ styles.modalBox }
            onPress={ (e) => e.stopPropagation() }
            accessible
            accessibilityViewIsModal
            accessibilityLabel="Disclaimer dialog"
          >
            <Text style={ styles.modalHeader }>DISCLAIMER</Text>
            <Text style={ styles.modalBody }>
              App was produced as a hobby, and is not an official app for St Albans City Academy.
            </Text>
            <TouchableOpacity
              ref={ modalCloseButtonRef }
              style={ styles.modalCloseBtn }
              onPress={ () => setDisclaimerVisible(false) }
              activeOpacity={ 0.7 }
              accessibilityRole="button"
              accessibilityLabel="Close disclaimer"
              accessibilityHint="Returns to settings"
            >
              <Text style={ styles.modalCloseBtnText }>Close</Text>
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
  teamsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  teamsLoadingText: { color: '#666', fontSize: 14 },
  teamsEmpty: { marginBottom: 16 },
  teamsEmptyText: { color: '#666', fontSize: 14, marginBottom: 12 },
  refreshButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0a2463',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: { color: '#FFD700', fontWeight: '600', fontSize: 14 },
  refreshLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  refreshLinkText: { color: '#0a63d1', fontSize: 14 },
  divisionRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
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
  accessibilitySection: { marginTop: 24 },
  accessibilityOption: {
    backgroundColor: '#0a2463',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  accessibilityOptionText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
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
  versionText: {
    marginTop: 12,
    color: '#999',
    fontSize: 12,
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
