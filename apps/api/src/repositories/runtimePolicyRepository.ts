import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepository } from './baseRepository.js';

export class RuntimePolicyRepository extends SupabaseRepository {
  readonly tableName = 'runtime_pool_policies';

  constructor(client: SupabaseClient) {
    super(client);
  }

  async list(limit = 100) {
    const response = await this.client.from(this.tableName).select('*').limit(limit);
    return this.assertNoError(response, `Failed to list runtime_pool_policies`, 'RUNTIME_POOL_POLICIES_LIST_FAILED', { table: this.tableName });
  }

  async getById(id: string) {
    const response = await this.client.from(this.tableName).select('*').eq('id', id).maybeSingle();
    return this.assertNoError(response, `Failed to read runtime_pool_policies record`, 'RUNTIME_POOL_POLICIES_READ_FAILED', { table: this.tableName, id });
  }
}
