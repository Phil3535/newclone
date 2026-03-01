import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

interface AppBackgroundProps {
  children: React.ReactNode;
  overlay?: boolean;
}

export default function AppBackground({ children, overlay = true }: AppBackgroundProps) {
  return (
    <ImageBackground
      source={require('../../assets/images/solar-background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      {overlay && <View style={styles.overlay} />}
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
  },
});
