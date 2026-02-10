import Constants from 'expo-constants';

const DEFAULT_EVENT_ID = '46915';

/** Event ID from app.json (expo.extra.eventId). Change there to point at a different event. */
export function getEventId(): string {
  const extra = Constants.expoConfig?.extra as { eventId?: string } | undefined;
  return extra?.eventId ?? DEFAULT_EVENT_ID;
}
