import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';
import { DualSyncService } from '../services/DualSyncService';
import { useAuthStore } from '../store/useAuthStore';

export function ReviewScreen() {
  const navigation = useNavigation();
  const { officerId } = useAuthStore();
  const [records, setRecords] = useState<ChallanRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<ChallanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = async () => {
    try {
      const allRecords = await database.get<ChallanRecord>('challan_records')
        .query()
        .fetch();
      // Show DRAFT and SYNCING records (actionable), then UPLOADED at the bottom
      const sorted = allRecords.sort((a, b) => {
        const statusOrder: Record<string, number> = { 'DRAFT': 0, 'SYNCING': 1, 'UPLOADED': 2 };
        return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      });
      setRecords(sorted);
      // Auto-select first record if none selected
      if (!selectedRecord && sorted.length > 0) {
        setSelectedRecord(sorted[0]);
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#34C759" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return '#FFD60A';
      case 'SYNCING': return '#007AFF';
      case 'UPLOADED': return '#34C759';
      default: return '#9CA3AF';
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Queue ({records.filter(r => r.status === 'DRAFT').length} pending)</Text>
        <View style={{ width: 40 }} />
      </View>

      {records.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.placeholderText}>No records yet. Start capturing!</Text>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Left panel: record list */}
          <ScrollView style={styles.listPanel}>
            {records.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={[
                  styles.listItem,
                  selectedRecord?.id === record.id && styles.listItemSelected
                ]}
                onPress={() => setSelectedRecord(record)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(record.status) }]} />
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    ...{record.sessionId.slice(-8)}
                  </Text>
                </View>
                <Text style={styles.listItemMeta}>{record.status} · {formatDate(record.createdAt)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Right panel: selected record details */}
          <ScrollView contentContainerStyle={styles.detailPanel}>
            {selectedRecord ? (
              <>
                <View style={styles.thumbnailPlaceholder}>
                  <Text style={styles.thumbnailText}>
                    Frame for ...{selectedRecord.sessionId.slice(-6)}
                  </Text>
                </View>

                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Date</Text>
                    <Text style={styles.metaValue}>{formatDate(selectedRecord.createdAt)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Time</Text>
                    <Text style={styles.metaValue}>{formatTime(selectedRecord.createdAt)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Location</Text>
                    <Text style={styles.metaValue}>
                      {selectedRecord.gpsLat ? `${selectedRecord.gpsLat.toFixed(4)}, ${selectedRecord.gpsLng?.toFixed(4)}` : 'GPS unavailable'}
                    </Text>
                  </View>
                  <View style={[styles.metaItem, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel}>Status</Text>
                    <Text style={[styles.metaValue, { color: getStatusColor(selectedRecord.status) }]}>
                      {selectedRecord.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.violationSection}>
                  <Text style={styles.sectionTitle}>System Detections</Text>
                  <View style={styles.tagContainer}>
                    {selectedRecord.systemTags?.length > 0 ? (
                      selectedRecord.systemTags.map(tag => (
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
                    {selectedRecord.manualTags?.length > 0 ? (
                      selectedRecord.manualTags.map(tag => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag.replace(/_/g, ' ')}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.placeholderText}>No manual tags added yet.</Text>
                    )}
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.placeholderText}>Select a record from the list</Text>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, (!selectedRecord || selectedRecord.status === 'UPLOADED' || submitting) && styles.disabledButton]}
          disabled={!selectedRecord || selectedRecord.status === 'UPLOADED' || submitting}
          onPress={async () => {
            if (!selectedRecord) return;
            setSubmitting(true);
            try {
              await DualSyncService.uploadEvidence(selectedRecord.id, officerId || 'OFFICER_MOCK');
              Alert.alert('Success', 'Report submitted successfully!');
              await fetchRecords();
              // Update selected record
              const updated = await database.get<ChallanRecord>('challan_records').find(selectedRecord.id);
              setSelectedRecord(updated);
            } catch (err) {
              Alert.alert('Upload Failed', 'Please try again when connected.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <Text style={styles.saveButtonText}>
            {submitting ? 'Submitting...' : selectedRecord?.status === 'UPLOADED' ? 'Already Submitted' : 'Submit Selected Report'}
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
  listPanel: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  listItemSelected: {
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listItemTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  listItemMeta: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  detailPanel: {
    flex: 1,
    padding: 20,
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
