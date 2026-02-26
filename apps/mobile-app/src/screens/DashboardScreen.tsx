import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';

export function DashboardScreen() {
  const [totalReports, setTotalReports] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const records = await database.get<ChallanRecord>('challan_records').query().fetch();
        setTotalReports(records.length);
        setPendingSync(records.filter(r => r.status === 'DRAFT' || r.status === 'SYNCING').length);
        setUploadedCount(records.filter(r => r.status === 'UPLOADED').length);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
    // Re-fetch every 5 seconds to keep stats fresh
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const accuracy = totalReports > 0 ? Math.round((uploadedCount / totalReports) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalReports}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingSync}</Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Upload Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{uploadedCount}</Text>
            <Text style={styles.statLabel}>Uploaded</Text>
          </View>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { backgroundColor: 'rgba(255,255,255,0.1)', width: '47%', padding: 20, borderRadius: 16 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#34C759', marginBottom: 4 },
  statLabel: { fontSize: 14, color: '#ccc' },
});
