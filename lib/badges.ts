import type { ImageSourcePropType } from 'react-native';

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

/** Crests are loaded from scraped pages and cached; no local badge assets. */
export function getBadgeSource(_teamName: string | null | undefined): ImageSourcePropType | null {
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
