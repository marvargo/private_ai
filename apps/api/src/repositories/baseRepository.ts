import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors/AppError.js';
import { redactSensitiveObject } from '../utils/redaction.js';

export abstract class SupabaseRepository {
  protected readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  protected databaseError(message: string, code: string, cause: unknown, safeDetails: Record<string, unknown> = {}) {
    return new AppError({
      message,
      code,
      statusCode: 503,
      safeDetails: redactSensitiveObject(safeDetails),
      cause,
    });
  }

  protected assertNoError<T>(response: { data: T; error: unknown }, message: string, code: string, safeDetails: Record<string, unknown> = {}): T {
    if (response.error) throw this.databaseError(message, code, response.error, safeDetails);
    return response.data;
  }
}
