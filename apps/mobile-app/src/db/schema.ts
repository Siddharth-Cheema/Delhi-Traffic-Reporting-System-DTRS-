import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
  version: 4,
  tables: [
    tableSchema({
      name: 'session_data',
      columns: [
        { name: 'officer_id', type: 'string' },
        { name: 'start_time', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'challan_records',
      columns: [
        { name: 'session_id', type: 'string', isIndexed: true },
        // draft, syncing, uploaded
        { name: 'status', type: 'string' },
        { name: 'gps_lat', type: 'number', isOptional: true },
        { name: 'gps_lng', type: 'number', isOptional: true },
        // json string
        { name: 'manual_tags', type: 'string', isOptional: true },
        // json string
        { name: 'system_tags', type: 'string', isOptional: true },
        { name: 'local_video_path', type: 'string' },
        { name: 'video_hash', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
})