import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export function LogScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>History & Logs</Text>
        </View>
        <View style={styles.logItem}>
          <Text style={styles.logText}>No recent logs</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  content: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  logItem: { padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  logText: { color: '#ccc' }
});
