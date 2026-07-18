import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseRepository } from './baseRepository.js';

export class ScalingRuleRepository extends SupabaseRepository {
  readonly tableName = 'runtime_scaling_rules';

  constructor(client: SupabaseClient) {
    super(client);
  }

  async list(limit = 100) {
    const response = await this.client.from(this.tableName).select('*').limit(limit);
    return this.assertNoError(response, `Failed to list runtime_scaling_rules`, 'RUNTIME_SCALING_RULES_LIST_FAILED', { table: this.tableName });
  }

  async getById(id: string) {
    const response = await this.client.from(this.tableName).select('*').eq('id', id).maybeSingle();
    return this.assertNoError(response, `Failed to read runtime_scaling_rules record`, 'RUNTIME_SCALING_RULES_READ_FAILED', { table: this.tableName, id });
  }
}
