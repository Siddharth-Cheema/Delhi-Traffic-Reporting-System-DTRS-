import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';

export function ReviewScreen() {
  const [latestRecord, setLatestRecord] = useState<ChallanRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const records = await database.get<ChallanRecord>('challan_records')
          .query()
          .fetch();

        if (records.length > 0) {
          // hack: grab latest for now
          setLatestRecord(records[records.length - 1]);
        }
      } catch (error) {
        console.error("Failed to fetch latest record:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#001F3F" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const displayDate = latestRecord
    ? new Date(latestRecord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '20 Feb 2024';

  const displayTime = latestRecord
    ? new Date(latestRecord.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '5:34 pm';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailText}>
            {latestRecord ? `Frame for ...${latestRecord.sessionId.slice(-6)}` : '1-FPS Frame Placeholder'}
          </Text>
        </View>

        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{displayDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={styles.metaValue}>{displayTime}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue}>
              {latestRecord?.gpsLat ? `${latestRecord.gpsLat.toFixed(4)}, ${latestRecord.gpsLng?.toFixed(4)}` : 'Connaught Place, Delhi'}
            </Text>
          </View>
        </View>

        <View style={styles.violationSection}>
          <Text style={styles.sectionTitle}>Automated System Detections</Text>
          <View style={styles.tagContainer}>
            {latestRecord && latestRecord.systemTags && latestRecord.systemTags.length > 0 ? (
              latestRecord.systemTags.map(tag => (
                <View key={tag} style={[styles.tag, styles.systemTag]}>
                  <Text style={[styles.tagText, styles.systemTagText]}>{tag.replace(/_/g, ' ')}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>Processing detections...</Text>
            )}
          </View>
        </View>

        <View style={styles.violationSection}>
          <Text style={styles.sectionTitle}>Manual Tags (Officer)</Text>
          <View style={styles.tagContainer}>
            {latestRecord && latestRecord.manualTags && latestRecord.manualTags.length > 0 ? (
              latestRecord.manualTags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.replace(/_/g, ' ')}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>No manual tags added yet.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (!latestRecord || latestRecord.status === 'UPLOADED') && styles.disabledButton]}
          disabled={!latestRecord || latestRecord.status === 'UPLOADED'}
        >
          <Text style={styles.saveButtonText}>
            {latestRecord?.status === 'UPLOADED' ? 'Report Submitted' : 'Submit Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#001F3F',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  thumbnailText: {
    color: '#CCC',
    fontWeight: '600',
    fontSize: 14,
  },
  metaContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  metaLabel: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
  },
  metaValue: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  violationSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  systemTag: {
    backgroundColor: 'rgba(52,199,89,0.2)',
    borderColor: 'rgba(52,199,89,0.4)',
  },
  systemTagText: {
    color: '#34C759',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    backgroundColor: '#001F3F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#001F3F',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
