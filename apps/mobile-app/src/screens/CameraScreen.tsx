import React from 'react';
import { StyleSheet, View } from 'react-native';
import CaptureEngine from '../components/CaptureEngine';

export function CameraScreen() {
  return (
    <View style={styles.container}>
      <CaptureEngine />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
