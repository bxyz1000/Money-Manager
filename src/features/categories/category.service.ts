import { supabase } from '@/services/supabase.client';
import { logDev } from '@/utils/logger';

/**
 * Category service — minimal list/create-or-get support for tagging
 * transactions. Categories are optional on every transaction.
 *
 * `ensureCategory` implements idempotent create-or-fetch so the add-transaction
 * form can accept free-text category names without a dedicated management
 * screen; duplicates resolve to the existing row (DB unique(user_id, name)).
 */

export interface CategoryRef {
  id: string;
  name: string;
}

export class CategoryServiceError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = 'CategoryServiceError';
    this.userMessage = userMessage;
  }
}

async function throwMapped(promise: PromiseLike<{
  data: unknown;
  error: { code?: string | null; message?: string; details?: string; hint?: string } | null;
}>): Promise<unknown> {
  const { data, error } = await promise;
  if (error) {
    console.error('[MoneyManager] Supabase Category Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    logDev('categories query failed', { pgCode: error.code ?? '', message: error.message });
    throw new CategoryServiceError(error.message || 'Something went wrong. Please try again.');
  }
  return data;
}

export async function listCategories(): Promise<CategoryRef[]> {
  const rows = (await throwMapped(
    supabase.from('categories').select('id,name').order('name', { ascending: true }),
  )) as CategoryRef[] | null;
  return rows ?? [];
}

/** Returns the existing category with this exact name, creating it if absent. */
export async function ensureCategory(rawName: string): Promise<CategoryRef> {
  const name = rawName.trim();
  if (name.length === 0) {
    throw new CategoryServiceError('Category name is required.');
  }

  const existing = (await throwMapped(
    supabase.from('categories').select('id,name').eq('name', name).limit(1),
  )) as CategoryRef[] | null;
  if (existing && existing.length > 0) {
    return existing[0] as CategoryRef;
  }

  const payload: { name: string } = { name };
  console.log('[MoneyManager] Creating category with payload:', JSON.stringify(payload));

  const inserted = (await throwMapped(
    supabase.from('categories').insert(payload).select().single(),
  )) as CategoryRef;
  return inserted;
}
