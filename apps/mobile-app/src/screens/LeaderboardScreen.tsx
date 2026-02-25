import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export function LeaderboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <View style={styles.tierCard}>
          <Text style={styles.tierTitle}>Gold Tier</Text>
          <Text style={styles.tierDesc}>Top 10% in Zone</Text>
        </View>
        <View style={styles.tierCard}>
          <Text style={styles.tierTitle}>Silver Tier</Text>
          <Text style={styles.tierDesc}>Top 30% in Zone</Text>
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
  tierCard: { padding: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, marginBottom: 12 },
  tierTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginBottom: 4 },
  tierDesc: { color: '#ccc' }
});
