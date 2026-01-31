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

/** Display name overrides (e.g. shorten GotSport names for UI) */
const DISPLAY_NAME_MAP: Record<string, string> = {
  'Milton Keynes Dons SET - Girls Milton Keynes Dons Girls Performance U14s': 'MK Dons Performance U14s',
};
const DISPLAY_NAME_PATTERNS: { pattern: RegExp; display: string }[] = [
  { pattern: /Milton Keynes Dons/i, display: 'MK Dons Performance U14s' },
];

export function getDisplayTeamName(teamName: string | null | undefined): string {
  if (teamName == null || typeof teamName !== 'string') return '';
  const name = teamName.trim();
  if (!name) return '';
  if (DISPLAY_NAME_MAP[name]) return stripYouth(DISPLAY_NAME_MAP[name]);
  for (const { pattern, display } of DISPLAY_NAME_PATTERNS) {
    if (pattern.test(name)) return stripYouth(display);
  }
  return stripYouth(name);
}

function stripYouth(s: string): string {
  return s.replace(/\s*youth\s*/gi, ' ').replace(/\s+/g, ' ').trim();
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
