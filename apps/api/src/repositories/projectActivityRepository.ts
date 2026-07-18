import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepository } from './baseRepository.js';

export class ProjectActivityRepository extends SupabaseRepository {
  readonly tableName = 'project_activity_events';

  constructor(client: SupabaseClient) {
    super(client);
  }

  async list(limit = 100) {
    const response = await this.client.from(this.tableName).select('*').limit(limit);
    return this.assertNoError(response, `Failed to list project_activity_events`, 'PROJECT_ACTIVITY_EVENTS_LIST_FAILED', { table: this.tableName });
  }

  async getById(id: string) {
    const response = await this.client.from(this.tableName).select('*').eq('id', id).maybeSingle();
    return this.assertNoError(response, `Failed to read project_activity_events record`, 'PROJECT_ACTIVITY_EVENTS_READ_FAILED', { table: this.tableName, id });
  }
}
