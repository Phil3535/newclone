import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScoreIndicatorProps {
  score: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export default function ScoreIndicator({ score, size = 'medium', showLabel = true }: ScoreIndicatorProps) {
  const getScoreColor = () => {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    if (score >= 25) return '#f97316';
    return '#ef4444';
  };

  const getScoreLabel = () => {
    if (score >= 75) return 'Hot';
    if (score >= 50) return 'Warm';
    if (score >= 25) return 'Cool';
    return 'Cold';
  };

  const dimensions = {
    small: { width: 40, height: 40, fontSize: 12 },
    medium: { width: 56, height: 56, fontSize: 16 },
    large: { width: 80, height: 80, fontSize: 24 },
  };

  const dim = dimensions[size];
  const color = getScoreColor();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          {
            width: dim.width,
            height: dim.height,
            borderColor: color,
            backgroundColor: `${color}20`,
          },
        ]}
      >
        <Text style={[styles.score, { fontSize: dim.fontSize, color }]}>
          {Math.round(score)}
        </Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{getScoreLabel()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    borderRadius: 100,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: 'bold',
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
