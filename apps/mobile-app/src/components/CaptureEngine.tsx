import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Video } from 'react-native-compressor';
import { runOnJS } from 'react-native-reanimated';
import { useCaptureStore } from '../store/useCaptureStore';
import { useAuthStore } from '../store/useAuthStore';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';
import { VehicleDetection } from '../db/models/VehicleDetection';
import { DualSyncService } from '../services/DualSyncService';

// Keep track of the active session ID outside react state so the worklet can access it
let currentActiveSessionId: string | null = null;

export default function CaptureEngine() {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const navigation = useNavigation<NavigationProp<any>>();
  const { draftCount, isLockedOut, incrementDrafts, checkLockoutStatus } = useCaptureStore();
  const { officerId } = useAuthStore();

  // Clock tick for overlay
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Location for overlay
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Update location every 10 seconds while camera is open
      const locWatcher = await Location.watchPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10
      }, (newLoc) => setLocation(newLoc));

      return () => locWatcher.remove();
    })();
  }, []);

  // sync on mount to recover any stuck records and clear zombies
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const RNFS = await import('react-native-fs');
        const records = await database.get<ChallanRecord>('challan_records').query().fetch();

        // 1. CLEAR ZOMBIE RECORDS (crashes during recording)
        const zombieRecords = records.filter(r => r.localVideoPath === 'RECORDING_IN_PROGRESS');
        if (zombieRecords.length > 0) {
          console.log(`Cleaning up ${zombieRecords.length} zombie records...`);
          await database.write(async () => {
            for (const zombie of zombieRecords) {
              await zombie.destroyPermanently();
            }
          });
        }

        // 2. RECOVER STUCK SYNCING
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
  const handleFastPing = async (frameDataUri: string) => {
    if (!currentActiveSessionId || !location) return;
    try {
       const response = await DualSyncService.fastPing(frameDataUri, {
         lat: location.coords.latitude,
         lng: location.coords.longitude
       });

       if (response && response.detections && response.detections.length > 0) {
         // Create local DB records for the newly found vehicles
         await database.write(async () => {
            const record = await database.get<ChallanRecord>('challan_records').find(currentActiveSessionId!);
            if (!record) return;

            for (const detection of response.detections) {
               // Only add if it's a vehicle (e.g. car, motorcycle) and not just a person
               if (['car', 'motorcycle', 'bus', 'truck', 'auto_rickshaw'].includes(detection.class)) {
                   await database.get<VehicleDetection>('vehicle_detections').create(v => {
                      v.challanRecord.set(record);
                      v.vehicleIdentifier = `${detection.class}_${Math.floor(Math.random()*10000)}`;
                      // If the backend returns a cropped thumbnail, save it here.
                      v.thumbnailUri = detection.thumbnail_url || undefined;
                      v.manualTags = []; // Ready for the user to fill out in ReviewDrawer
                   });
               }
            }
         });
       }
    } catch (e) {
       console.error("Frame ping dropped:", e);
    }
  };

  const lastFrameTime = useRef<number>(0);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'
    if (!currentActiveSessionId) return;

    // Throttle to roughly 1 frame per second
    const now = Date.now();
    if (now - lastFrameTime.current < 1000) return;
    lastFrameTime.current = now;

    // NOTE: In a real environment, you would use a native plugin or logic
    // to convert the frame to a JPEG buffer/URI here.
    // We point to a bundled asset for testing so the RNFS file hash works.
    const dummyFrameUri = 'dummy_frame.jpg'; // We'll handle resolution in fastPing

    runOnJS(handleFastPing)(dummyFrameUri);
  }, []);

  const startRecording = useCallback(async () => {
    if (isLockedOut) {
      Alert.alert("Lockout", "Please review and submit your 10 draft challans before recording more.");
      return;
    }

    if (camera.current) {
      setIsRecording(true);

      // We generate the session ID immediately so the frame processor knows where to attach vehicles
      const sessionId = `SESSION_${Date.now()}`;

      // Create the draft record FIRST, so fast pings have a parent record to attach to.
      let recordId = '';
      await database.write(async () => {
        const newRecord = await database.get<ChallanRecord>('challan_records').create(record => {
          record.sessionId = sessionId;
          record.status = 'DRAFT';
          record.localVideoPath = 'RECORDING_IN_PROGRESS'; // Placeholder
          record.videoHash = '';
          record.manualTags = [];
          record.systemTags = [];
        });
        recordId = newRecord.id;
      });

      currentActiveSessionId = recordId;

      camera.current.startRecording({
        onRecordingFinished: (video) => {
          setIsRecording(false);
          currentActiveSessionId = null; // Stop frame processor tagging
          incrementDrafts();
          console.log("Raw Video captured:", video.path);
          (async () => {
            try {
              console.log("Compressing video to save space...");
              // Intelligent compression like WhatsApp HD
              const compressedVideoPath = await Video.compress(
                video.path,
                {
                  compressionMethod: 'auto',
                  minimumFileSizeForCompress: 1, // Compress anything over 1MB
                },
                (progress) => {
                  console.log('Compression Progress: ', progress);
                }
              );
              console.log("Compression complete:", compressedVideoPath);

              const { sha256 } = await import('react-native-sha256');
              const RNFS = await import('react-native-fs');

              // Hash the compressed video
              const fileHash = await RNFS.hash(compressedVideoPath, 'sha256');

              // Update the existing draft record with the final video path and hash
              await database.write(async () => {
                const record = await database.get<ChallanRecord>('challan_records').find(recordId);
                await record.update(r => {
                  r.localVideoPath = compressedVideoPath;
                  r.videoHash = fileHash;
                });
              });

            } catch (err) {
              console.error("Failed to process captured video", err);
            }
          })();
        },
        onRecordingError: (error) => {
          setIsRecording(false);
          currentActiveSessionId = null;
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
        {/* GPS and Time Overlay Container */}
        <View style={styles.topBar}>
          <View style={styles.dataBadge}>
            <Text style={styles.dataText}>
              {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
            </Text>
            {location ? (
              <Text style={styles.dataText}>
                LAT: {location.coords.latitude.toFixed(6)}  LON: {location.coords.longitude.toFixed(6)}
              </Text>
            ) : (
              <Text style={styles.dataText}>Acquiring GPS Signal...</Text>
            )}
            <Text style={styles.dataText}>OFFICER ID: {officerId || '007'}</Text>
          </View>

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
  topBar: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dataBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffcc00',
  },
  dataText: {
    color: '#00FF00', // Hacker green for instrument panel feel
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
