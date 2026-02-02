import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getBadgeSource, getTeamInitials } from '../lib/badges';

type TeamBadgeProps = {
  teamName: string;
  size?: number;
};

const DEFAULT_SIZE = 28;

export function TeamBadge ({ teamName, size = DEFAULT_SIZE }: TeamBadgeProps) {
  const [ imageError, setImageError ] = useState(false);
  const source = getBadgeSource(teamName);
  const showImage = source !== null && !imageError;

  if (showImage && source !== null) {
    return (
      <Image
        source={ source }
        style={ [ styles.badge, { width: size, height: size, borderRadius: size / 2 } ] }
        onError={ () => setImageError(true) }
        accessible
        accessibilityLabel={ `${ teamName } crest` }
      />
    );
  }

  const initials = getTeamInitials(teamName);
  return (
    <View
      style={ [ styles.fallback, { width: size, height: size, borderRadius: size / 2 } ] }
      accessible
      accessibilityLabel={ teamName }
    >
      <Text style={ [ styles.initials, { fontSize: size * 0.4 } ] } numberOfLines={ 1 } accessible={ false }>
        { initials }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: '#f5f5f5' },
  fallback: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  initials: { color: '#e94560', fontWeight: '700' },
});
