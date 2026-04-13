/**
 * Server-only cache helpers backed by Supabase cricket_cache table.
 * DO NOT import this file from client components.
 */
import { createServiceRoleClient } from "@/lib/supabase-server";

/** Cache TTLs in milliseconds */
export const CACHE_TTL = {
  live: 30_000,
  matches: 300_000,
  rankings: 3_600_000,
  records: 86_400_000,
  news: 900_000,
  schedule: 3_600_000,
} as const;

/**
 * Read from Supabase cricket_cache.
 * Returns null if missing or older than ttlMs.
 */
export async function getCached<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("cricket_cache")
      .select("data, updated_at")
      .eq("key", key)
      .single();
    if (!data) return null;
    if (Date.now() - new Date(data.updated_at as string).getTime() > ttlMs) return null;
    return data.data as T;
  } catch {
    return null;
  }
}

/**
 * Write to Supabase cricket_cache (upsert).
 * Fire-and-forget — never throws.
 */
export async function setCached(key: string, value: unknown): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("cricket_cache").upsert(
      { key, data: value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {
    // non-blocking, ignore failures
  }
}
