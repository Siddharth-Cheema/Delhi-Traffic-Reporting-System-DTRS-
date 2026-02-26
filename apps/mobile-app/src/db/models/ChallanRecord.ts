import { Model, Query } from '@nozbe/watermelondb'
import { field, text, json, readonly, date, children } from '@nozbe/watermelondb/decorators'
import { VehicleDetection } from './VehicleDetection'

const sanitizeTags = (rawTags: string | undefined): string[] => {
  if (!rawTags) return []
  try {
    return JSON.parse(rawTags)
  } catch (e) {
    return []
  }
}

export class ChallanRecord extends Model {
  static table = 'challan_records'

  static associations = {
    vehicle_detections: { type: 'has_many', foreignKey: 'challan_record_id' },
  } as const

  @children('vehicle_detections') vehicleDetections!: Query<VehicleDetection>

  @text('session_id') sessionId!: string
  // draft, syncing, uploaded
  @text('status') status!: string
  @field('gps_lat') gpsLat?: number
  @field('gps_lng') gpsLng?: number
  @text('local_video_path') localVideoPath!: string
  @text('video_hash') videoHash?: string

  @json('manual_tags', sanitizeTags) manualTags!: string[]
  @json('system_tags', sanitizeTags) systemTags!: string[]

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
