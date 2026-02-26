import { Model } from '@nozbe/watermelondb'
import { text, json, readonly, date, relation } from '@nozbe/watermelondb/decorators'

const sanitizeTags = (rawTags: string | undefined): string[] => {
  if (!rawTags) return []
  try {
    return JSON.parse(rawTags)
  } catch (e) {
    return []
  }
}

export class VehicleDetection extends Model {
  static table = 'vehicle_detections'

  static associations = {
    challan_records: { type: 'belongs_to', key: 'challan_record_id' },
  } as const

  @relation('challan_records', 'challan_record_id') challanRecord!: any

  @text('vehicle_identifier') vehicleIdentifier!: string
  @text('thumbnail_uri') thumbnailUri?: string

  @json('manual_tags', sanitizeTags) manualTags!: string[]

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date
}
