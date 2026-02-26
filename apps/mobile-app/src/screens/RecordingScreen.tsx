import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';
import { DualSyncService } from '../services/DualSyncService';
import { useCaptureStore } from '../store/useCaptureStore';
import { useAuthStore } from '../store/useAuthStore';
import { hashFile } from '../utils/hashFile';

export function RecordingScreen() {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const navigation = useNavigation();
  const [isRecording, setIsRecording] = useState(false);
  const { incrementDrafts, isLockedOut } = useCaptureStore();
  const { officerId } = useAuthStore();
  const lastPingTime = useRef(0);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permission to access location was denied');
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (err) {
        console.error("Failed to get location:", err);
      }
    })();
  }, []);

  // Fast ping throttle
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const now = Date.now();
    if (now - lastPingTime.current < 1000) return;
    lastPingTime.current = now;

    // Skia frame extraction requires VisionCamera v4+ with Skia integration
  }, []);

  const startRecording = async () => {
    if (isLockedOut) {
      Alert.alert("Lockout", "Maximum drafts reached. Please review captures.");
      return;
    }
    if (camera.current) {
      try {
        setIsRecording(true);
        camera.current.startRecording({
          onRecordingFinished: async (video) => {
            setIsRecording(false);
            const sessionId = `SESSION_${Date.now()}`;

            try {
              // Hash the video using expo-crypto
              const fileHash = await hashFile(video.path);

              // Store metadata locally
              let recordId = '';
              await database.write(async () => {
                const newRecord = await database.get<ChallanRecord>('challan_records').create(r => {
                  r.sessionId = sessionId;
                  r.status = 'DRAFT';
                  r.localVideoPath = video.path;
                  r.videoHash = fileHash;
                  r.manualTags = [];
                  r.systemTags = [];
                  r.gpsLat = location?.coords.latitude;
                  r.gpsLng = location?.coords.longitude;
                });
                recordId = newRecord.id;
              });

              incrementDrafts();

              DualSyncService.uploadEvidence(recordId, officerId || 'OFFICER_MOCK').catch(err => {
                console.error("Sync error:", err);
              });

            } catch (err) {
              console.error("Post-recording processing failed:", err);
            }
          },
          onRecordingError: (error) => {
            setIsRecording(false);
            console.error("Recording Error:", error);
          },
        });
      } catch (err) {
        setIsRecording(false);
        console.error("Failed to start recording:", err);
      }
    }
  };

  const stopRecording = async () => {
    if (camera.current && isRecording) {
      await camera.current.stopRecording();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (device == null) return <View style={styles.container}><Text style={styles.text}>Loading Camera...</Text></View>;

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        frameProcessor={frameProcessor}
      />

      {/* glassmorphism overlay */}
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <View style={styles.statusIndicator}>
            <View style={styles.connectionDot} />
            <Text style={styles.statusText}>4G - LIVE</Text>
          </View>
          <View style={styles.timerContainer}>
            <View style={[styles.dot, isRecording && { opacity: 1 }]} />
            <Text style={styles.timerText}>
              {String(Math.floor(recordingSeconds / 3600)).padStart(2, '0')}:{String(Math.floor((recordingSeconds % 3600) / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.glassControls}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingActive]}
              onPress={toggleRecording}
            >
              <View style={[styles.recordButtonInner, isRecording && styles.recordingInnerActive]} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 31, 63, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBar: {
    alignItems: 'center',
    marginBottom: 40,
  },
  glassControls: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recordButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recordButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'white',
  },
  recordingActive: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  recordingInnerActive: {
    backgroundColor: '#FF3B30',
    width: 30,
    height: 30,
    borderRadius: 4,
  }
});
