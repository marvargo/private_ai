import { env } from './env.js';

export function isProductionRuntime(): boolean {
  return env.NODE_ENV === 'production';
}

export function allowInMemoryFallback(): boolean {
  if (isProductionRuntime()) return false;
  return env.ALLOW_IN_MEMORY_FALLBACK === 'true';
}
