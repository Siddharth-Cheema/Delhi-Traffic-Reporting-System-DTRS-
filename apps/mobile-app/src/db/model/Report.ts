import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class Report extends Model {
  static table = 'reports';

  @text('violation_type') violationType!: string;
  @field('location_lat') locationLat!: number;
  @field('location_lon') locationLon!: number;
  @date('timestamp') timestamp!: number;
  @text('status') status!: string;
  @text('image_path') imagePath!: string;
  @field('is_synced') isSynced!: boolean;

  @readonly @date('created_at') createdAt!: number;
  @readonly @date('updated_at') updatedAt!: number;
}
