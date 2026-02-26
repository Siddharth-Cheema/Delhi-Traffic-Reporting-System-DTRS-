import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useCaptureStore } from '../store/useCaptureStore';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';
import { VehicleDetection } from '../db/models/VehicleDetection';
import { DualSyncService } from '../services/DualSyncService';
import { useAuthStore } from '../store/useAuthStore';

import { SwipeButton } from './SwipeButton';

const VIOLATION_TAGS = [
  'NO_HELMET',
  'TRIPLE_RIDING',
  'WRONG_SIDE',
  'RED_LIGHT_JUMP',
  'DEFECTIVE_NUMBER_PLATE',
  'USE_OF_MOBILE',
  'OVERSPEEDING',
  'NO_PUC',
  'FALSE_INSURANCE',
  'ILLEGAL_PARKING'
];

interface ReviewDrawerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ReviewDrawer: React.FC<ReviewDrawerProps> = ({ isVisible, onClose }) => {
  const [drafts, setDrafts] = useState<(ChallanRecord & { vehicles: VehicleDetection[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { clearDrafts, checkLockoutStatus } = useCaptureStore();
  const { officerId } = useAuthStore();

  useEffect(() => {
    if (isVisible) {
      loadDrafts();
    }
  }, [isVisible]);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const records = await database.get<ChallanRecord>('challan_records')
        .query()
        .fetch();

      const draftRecords = records.filter(r => r.status === 'DRAFT' || r.status === 'SYNCING');

      // Fetch associated vehicles for each draft
      const draftsWithVehicles = await Promise.all(
        draftRecords.map(async (record) => {
          const vehicles = await record.vehicleDetections.fetch();
          return Object.assign(record, { vehicles });
        })
      );

      setDrafts(draftsWithVehicles);
      checkLockoutStatus(draftRecords.length);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVehicleTag = async (vehicle: VehicleDetection, tag: string) => {
    try {
      await database.write(async () => {
        const currentTags = vehicle.manualTags || [];
        const newTags = currentTags.includes(tag)
          ? currentTags.filter(t => t !== tag)
          : [...currentTags, tag];

        await vehicle.update(v => {
          v.manualTags = newTags;
        });
      });
      // Refresh UI
      await loadDrafts();
    } catch (error) {
      console.error('Error updating vehicle tags:', error);
    }
  };

  const handleSubmit = async () => {
    if (drafts.length === 0) {
      Alert.alert('Info', 'No drafts to submit.');
      return;
    }

    setSubmitting(true);
    let successCount = 0;

    try {
      // Validate that at least one vehicle has tags
      for (const record of drafts) {
        const hasAnyTags = record.vehicles.some(v => v.manualTags && v.manualTags.length > 0);

        if (!hasAnyTags && record.vehicles.length > 0) {
          Alert.alert('Missing Tags', `Please add at least one violation tag to a vehicle for video ...${record.sessionId.slice(-6)}`);
          setSubmitting(false);
          return;
        }
      }

      for (const record of drafts) {
        try {
          await DualSyncService.uploadEvidence(record.id, officerId || 'OFFICER_MOCK');
          successCount++;
        } catch (error) {
          console.error(`Failed to upload record ${record.id}:`, error);
        }
      }

      if (successCount === drafts.length) {
        Alert.alert('Success', 'All records submitted successfully.');
        clearDrafts();
        onClose();
      } else {
        Alert.alert('Partial Success', `${successCount} of ${drafts.length} records submitted. Please try again.`);
      }

      await loadDrafts(); // refresh ui
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit records. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDraftItem = ({ item }: { item: ChallanRecord & { vehicles: VehicleDetection[] } }) => {
    return (
      <View style={styles.draftItem}>
        <View style={styles.draftHeader}>
          <Text style={styles.draftId}>Video: ...{item.sessionId.slice(-8)}</Text>
          <Text style={styles.draftStatus}>{item.status}</Text>
        </View>

        {item.vehicles.length === 0 ? (
           <Text style={styles.noVehiclesText}>No vehicles detected in this video yet.</Text>
        ) : (
          item.vehicles.map((vehicle, index) => (
            <View key={vehicle.id} style={styles.vehicleContainer}>
              <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleTitle}>Vehicle {index + 1} ({vehicle.vehicleIdentifier.split('_')[0]})</Text>
              </View>

              <Text style={styles.tagsLabel}>Select Violation Tags:</Text>
              <View style={styles.tagsContainer}>
                {VIOLATION_TAGS.map(tag => {
                  const isSelected = vehicle.manualTags?.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagButton, isSelected && styles.tagButtonSelected]}
                      onPress={() => toggleVehicleTag(vehicle, tag)}
                    >
                      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                        {tag.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Pending Challans ({drafts.length})</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
          ) : drafts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending drafts.</Text>
            </View>
          ) : (
            <FlatList
              data={drafts}
              keyExtractor={item => item.id}
              renderItem={renderDraftItem}
              contentContainerStyle={styles.listContent}
            />
          )}

          <View style={styles.drawerFooter}>
            {drafts.length === 0 ? (
              <TouchableOpacity style={styles.submitButtonDisabled} disabled>
                <Text style={styles.submitButtonText}>No Records to Submit</Text>
              </TouchableOpacity>
            ) : submitting ? (
              <View style={[styles.submitButton, { backgroundColor: '#34C759' }]}>
                <ActivityIndicator color="white" />
              </View>
            ) : (
              <SwipeButton
                title={`Swipe to Upload (${drafts.length})`}
                onSwipeSuccess={handleSubmit}
              />
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  draftItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  draftId: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  draftStatus: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: 'bold',
    backgroundColor: '#FFF5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  noVehiclesText: {
    fontStyle: 'italic',
    color: '#888',
    marginTop: 10,
  },
  vehicleContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'white',
    marginRight: 8,
    marginBottom: 8,
  },
  tagButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
  tagTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
