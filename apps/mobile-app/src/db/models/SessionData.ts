import { Model } from '@nozbe/watermelondb'
import { field, date, text } from '@nozbe/watermelondb/decorators'

export class SessionData extends Model {
  static table = 'session_data'

  @text('officer_id') officerId!: string
  @date('start_time') startTime!: Date
}
