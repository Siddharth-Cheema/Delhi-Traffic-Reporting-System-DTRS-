import axios from 'axios';
import { database } from '../db';
import { ChallanRecord } from '../db/models/ChallanRecord';
// todo: implement expo-network or netinfo

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export class DualSyncService {

  // sync fast pings (foreground/4G)
  static async fastPing(imageUri: string, gps: { lat: number, lng: number }) {
    try {
      const RNFS = await import('react-native-fs');

      const frameHash = await RNFS.hash(imageUri, 'sha256');

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'frame.jpg',
        type: 'image/jpeg'
      } as any);

      formData.append('gps_lat', gps.lat.toString());
      formData.append('gps_lng', gps.lng.toString());
      formData.append('frame_hash', frameHash);

      const response = await axios.post(`${API_BASE_URL}/api/v1/capture/ping`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      console.error("Fast Ping Failed:", error);
      // hack: return empty detections instead of failing to not block UI
      return { detections: [], _error: 'fast_ping_failed' };
    }
  }

  // heavy sync background mp4 upload
  static async uploadEvidence(recordId: string, officerId: string = 'OFFICER_DEFAULT') {
    try {
      const record = await database.get<ChallanRecord>('challan_records').find(recordId);
      if (record.status === 'UPLOADED') return;

      const formData = new FormData();
      formData.append('session_id', record.sessionId);
      formData.append('officer_id', officerId);
      formData.append('manual_tags', record.manualTags.join(','));

      if (record.videoHash) {
        formData.append('video_hash', record.videoHash);
      }

      formData.append('video', {
        uri: record.localVideoPath,
        name: `evidence_${record.sessionId}.mp4`,
        type: 'video/mp4'
      } as any);

      // mark syncing to prevent dupes
      await database.write(async () => {
        await record.update(r => {
          r.status = 'SYNCING';
        });
      });

      const response = await axios.post(`${API_BASE_URL}/api/v1/capture/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // mark fully uploaded
      if (response.status === 200) {
        await database.write(async () => {
          await record.update(r => {
            r.status = 'UPLOADED';
          });
        });
      }

      return response.data;
    } catch (error) {
      console.error("Heavy Sync Failed:", error);
      // revert status on failure
      const failedRecord = await database.get<ChallanRecord>('challan_records').find(recordId);
      await database.write(async () => {
        await failedRecord.update(r => {
          r.status = 'DRAFT';
        });
      });
      throw error;
    }
  }
}
