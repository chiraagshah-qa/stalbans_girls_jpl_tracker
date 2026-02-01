import type { ImageSourcePropType } from 'react-native';
import { TEAM_CREST_SOURCES } from './teamCrests';

const atleticoLondon = require('../assets/atletico-london.png');
const capitalGirls = require('../assets/capital-girls.jpeg');
const aylesburyUnited = require('../assets/aylesbury-united.png');
const stAlbans = require('../assets/st-albans.webp');
const lutonTown = require('../assets/luton-town.png');
const oxfordCity = require('../assets/oxford-city.png');
const oxfordUnited = require('../assets/oxford-united.png');
const mkDons = require('../assets/mk-dons.png');
const stevenage = require('../assets/stevenage.png');
const northampton = require('../assets/northampton.png');
const prestburyPhantoms = require('../assets/prestbury-phantoms-crest.png');

const LOCAL_BADGES: { key: string; source: ImageSourcePropType }[] = [
  { key: 'Atletico London', source: atleticoLondon },
  { key: 'Capital Girls', source: capitalGirls },
  { key: 'Aylesbury United', source: aylesburyUnited },
  { key: 'St Albans', source: stAlbans },
  { key: 'Luton Town', source: lutonTown },
  { key: 'Oxford City', source: oxfordCity },
  { key: 'Oxford United', source: oxfordUnited },
  { key: 'Milton Keynes Dons', source: mkDons },
  { key: 'MK Dons', source: mkDons },
  { key: 'Stevenage', source: stevenage },
  { key: 'Northampton', source: northampton },
  { key: 'Prestbury Phantoms', source: prestburyPhantoms },
];

/** Words to remove from team names (age/gender) */
const STRIP_WORDS = /\b(U14|U14s|U16|U16s|Girls)\b/gi;

function stripWords(s: string): string {
  return s.replace(STRIP_WORDS, ' ').replace(/\s+/g, ' ').trim();
}

/** Shorten for display: remove U14/U16/Girls, format "Club - Team name" when present */
export function shortenTeamName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const dash = ' - ';
  const idx = trimmed.indexOf(dash);
  if (idx !== -1) {
    const club = stripWords(trimmed.slice(0, idx));
    const teamPart = stripWords(trimmed.slice(idx + dash.length));
    if (teamPart) return `${club} - ${teamPart}`;
    return club || trimmed;
  }
  return stripWords(trimmed) || trimmed;
}

/** Display name overrides (e.g. shorten GotSport names for UI). Returned as-is (not shortened). */
const DISPLAY_NAME_MAP: Record<string, string> = {
  'Milton Keynes Dons SET - Girls Milton Keynes Dons Girls Performance U14s': 'MK Dons - Performance',
};
const DISPLAY_NAME_PATTERNS: { pattern: RegExp; display: string }[] = [
  { pattern: /Milton Keynes Dons/i, display: 'MK Dons - Performance' },
  { pattern: /Capital\s*Girls/i, display: 'Capital Girls' },
  { pattern: /Luton Town Ladies/i, display: 'Luton Town Ladies FC - Wanderers' },
  { pattern: /Atletico London/i, display: 'Athletico London - Dragons' },
  { pattern: /Prestbury Phantoms/i, display: 'Prestbury Phantoms AFC - Trojans' },
];

export function getDisplayTeamName(teamName: string | null | undefined): string {
  if (teamName == null || typeof teamName !== 'string') return '';
  const name = teamName.trim();
  if (!name) return '';
  const mapResult = DISPLAY_NAME_MAP[name];
  if (mapResult !== undefined) return mapResult;
  for (const { pattern, display } of DISPLAY_NAME_PATTERNS) {
    if (pattern.test(name)) return display;
  }
  return shortenTeamName(name);
}

export function getBadgeSource(teamName: string | null | undefined): ImageSourcePropType | null {
  if (teamName == null || typeof teamName !== 'string') return null;
  const name = teamName.trim();
  if (!name) return null;
  if (TEAM_CREST_SOURCES[name]) return TEAM_CREST_SOURCES[name];
  for (const { key, source } of LOCAL_BADGES) {
    if (name.includes(key)) return source;
  }
  return null;
}

export function getTeamInitials(teamName: string | null | undefined): string {
  if (teamName == null || typeof teamName !== 'string') return '?';
  const trimmed = teamName.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase().slice(0, 2);
  }
  return trimmed.slice(0, 2).toUpperCase();
}
