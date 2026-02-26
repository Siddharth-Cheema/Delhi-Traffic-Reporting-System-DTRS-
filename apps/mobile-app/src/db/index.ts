import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import { SessionData } from './models/SessionData';
import { ChallanRecord } from './models/ChallanRecord';
import { VehicleDetection } from './models/VehicleDetection';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'dtrs_db',
  jsi: true,
  onSetUpError: (error) => {
    console.error('WatermelonDB setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    SessionData,
    ChallanRecord,
    VehicleDetection,
  ],
});
