/**
 * Club crests are no longer stored in the app.
 * All crests are loaded from scraped schedule/results pages and cached (see CrestContext + cache).
 */
import type { ImageSourcePropType } from 'react-native';

export const TEAM_CREST_SOURCES: Record<string, ImageSourcePropType> = {};
