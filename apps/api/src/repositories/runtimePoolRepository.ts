import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepository } from './baseRepository.js';

export class RuntimePoolRepository extends SupabaseRepository {
  readonly tableName = 'runtime_pools';

  constructor(client: SupabaseClient) {
    super(client);
  }

  async list(limit = 100) {
    const response = await this.client.from(this.tableName).select('*').limit(limit);
    return this.assertNoError(response, `Failed to list runtime_pools`, 'RUNTIME_POOLS_LIST_FAILED', { table: this.tableName });
  }

  async getById(id: string) {
    const response = await this.client.from(this.tableName).select('*').eq('id', id).maybeSingle();
    return this.assertNoError(response, `Failed to read runtime_pools record`, 'RUNTIME_POOLS_READ_FAILED', { table: this.tableName, id });
  }
}
