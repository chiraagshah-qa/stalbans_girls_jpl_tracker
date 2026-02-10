import Constants from 'expo-constants';
import { getEventId } from '../eventConfig';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return (global as unknown as { __expoConfig: unknown }).__expoConfig;
    },
  },
}));

const setExpoConfig = (config: unknown) => {
  (global as unknown as { __expoConfig: unknown }).__expoConfig = config;
};

describe('getEventId', () => {
  const originalGlobal = global as unknown as { __expoConfig?: unknown };

  afterEach(() => {
    delete originalGlobal.__expoConfig;
  });

  it('returns eventId from expo.extra when set', () => {
    setExpoConfig({ extra: { eventId: '12345' } });
    expect(getEventId()).toBe('12345');
  });

  it('returns default event ID when extra.eventId is missing', () => {
    setExpoConfig({ extra: {} });
    expect(getEventId()).toBe('46915');
  });

  it('returns default event ID when extra is missing', () => {
    setExpoConfig({});
    expect(getEventId()).toBe('46915');
  });

  it('returns default event ID when expoConfig is undefined', () => {
    setExpoConfig(undefined);
    expect(getEventId()).toBe('46915');
  });
});
