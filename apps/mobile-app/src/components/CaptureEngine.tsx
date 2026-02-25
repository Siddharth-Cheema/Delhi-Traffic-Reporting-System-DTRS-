import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useCaptureStore } from '../store/useCaptureStore';
import { useAuthStore } from '../store/useAuthStore';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';
import { DualSyncService } from '../services/DualSyncService';

export default function CaptureEngine() {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const navigation = useNavigation<NavigationProp<any>>();
  const { draftCount, isLockedOut, incrementDrafts, checkLockoutStatus } = useCaptureStore();
  const { officerId } = useAuthStore();

  // sync on mount to recover any stuck records
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const RNFS = await import('react-native-fs');
        const records = await database.get<ChallanRecord>('challan_records').query().fetch();

        const stuckRecords = records.filter(r => r.status === 'SYNCING');
        if (stuckRecords.length > 0) {
          await database.write(async () => {
            for (const record of stuckRecords) {
              await record.update(r => {
                r.status = 'DRAFT';
              });
            }
          });
        }

        // recover orphaned videos from cache
        const cacheDir = RNFS.CachesDirectoryPath;
        const cacheFiles = await RNFS.readDir(cacheDir);
        const videoFiles = cacheFiles.filter(f => f.name.endsWith('.mp4'));

        if (videoFiles.length > 0) {
          const existingPaths = new Set(records.map(r => r.localVideoPath));
          const orphanedVideos = videoFiles.filter(f => !existingPaths.has(f.path));

          if (orphanedVideos.length > 0) {
            console.log(`DIRTY_RECOVERY: Recovering ${orphanedVideos.length} orphaned videos from cache.`);
            await database.write(async () => {
              for (const video of orphanedVideos) {
                const fileHash = await RNFS.hash(video.path, 'sha256');
                await database.get<ChallanRecord>('challan_records').create(record => {
                  record.sessionId = `RECOVERED_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                  record.status = 'DRAFT';
                  record.localVideoPath = video.path;
                  record.videoHash = fileHash;
                  record.manualTags = ['RECOVERED'];
                });
              }
            });
            // re-fetch records after recovery
            const updatedRecords = await database.get<ChallanRecord>('challan_records').query().fetch();
            const currentDraftCount = updatedRecords.filter(r => r.status === 'DRAFT' || r.status === 'SYNCING').length;
            checkLockoutStatus(currentDraftCount);
            return;
          }
        }

        const currentDraftCount = records.filter(r => r.status === 'DRAFT' || r.status === 'SYNCING').length;
        checkLockoutStatus(currentDraftCount);
      } catch (error) {
        console.error("Failed to initialize database records:", error);
      }
    };

    initializeApp();
  }, [checkLockoutStatus]);

  // 1fps headless frame extractor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'
  }, []);

  const startRecording = useCallback(async () => {
    if (isLockedOut) {
      Alert.alert("Lockout", "Please review and submit your 10 draft challans before recording more.");
      return;
    }

    if (camera.current) {
      setIsRecording(true);
      camera.current.startRecording({
        onRecordingFinished: (video) => {
          setIsRecording(false);
          incrementDrafts();
          console.log("Video captured:", video.path);
          (async () => {
            try {
              const { sha256 } = await import('react-native-sha256');
              const RNFS = await import('react-native-fs');
              const sessionId = `SESSION_${Date.now()}`;

              const fileHash = await RNFS.hash(video.path, 'sha256');

              let recordId = '';
              await database.write(async () => {
                const newRecord = await database.get<ChallanRecord>('challan_records').create(record => {
                  record.sessionId = sessionId;
                  record.status = 'DRAFT';
                  record.localVideoPath = video.path;
                  record.videoHash = fileHash;
                  record.manualTags = [];
                  record.systemTags = [];
                });
                recordId = newRecord.id;
              });

              // trigger sync in background
              DualSyncService.uploadEvidence(recordId, officerId || 'OFFICER_MOCK').catch(err => {
                console.error("Background Heavy Sync Failed:", err);
              });

            } catch (err) {
              console.error("Failed to process captured video", err);
            }
          })();
        },
        onRecordingError: (error) => {
          setIsRecording(false);
          console.error(error);
        },
      });
    }
  }, [isLockedOut, incrementDrafts]);

  const stopRecording = useCallback(async () => {
    if (camera.current && isRecording) {
      await camera.current.stopRecording();
    }
  }, [isRecording]);

  if (device == null) return <Text>Loading Camera...</Text>;

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={false}
        frameProcessor={frameProcessor}
        // vision camera v4 doesnt use frameProcessorFps
      />

      {/* ui overlay */}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Review')}>
            <Text style={styles.draftText}>Drafts: {draftCount}/10</Text>
          </TouchableOpacity>
        </View>

        {isLockedOut && (
          <View style={styles.lockoutOverlay}>
            <Text style={styles.lockoutText}>Maximum Drafts Reached</Text>
            <Text style={styles.lockoutSubText}>Please review the right pane</Text>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => navigation.navigate('Review')}
            >
              <Text style={styles.reviewButtonText}>Open Review Pane</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.captureButton, isRecording && styles.recordingButton]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={isLockedOut}
          >
            {isRecording && <View style={styles.recordingIndicator} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'flex-end',
  },
  draftText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 8,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    borderColor: 'red',
  },
  recordingIndicator: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: 'red',
  },
  lockoutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockoutText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  lockoutSubText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  reviewButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
