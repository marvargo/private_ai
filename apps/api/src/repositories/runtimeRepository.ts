import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepository } from './baseRepository.js';

export class RuntimeRepository extends SupabaseRepository {
  readonly tableName = 'model_runtimes';

  constructor(client: SupabaseClient) {
    super(client);
  }

  async list(limit = 100) {
    const response = await this.client.from(this.tableName).select('*').limit(limit);
    return this.assertNoError(response, `Failed to list model_runtimes`, 'MODEL_RUNTIMES_LIST_FAILED', { table: this.tableName });
  }

  async getById(id: string) {
    const response = await this.client.from(this.tableName).select('*').eq('id', id).maybeSingle();
    return this.assertNoError(response, `Failed to read model_runtimes record`, 'MODEL_RUNTIMES_READ_FAILED', { table: this.tableName, id });
  }
}
