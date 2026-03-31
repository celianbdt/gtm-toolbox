import { createAdminClient } from "@/lib/supabase/admin";
import type { EnricherProvider } from "../types";

const TABLE = "ops_enrichment_cache";

// ── Single field lookup ──

export async function lookupCache(
  workspaceId: string,
  domain: string,
  provider: EnricherProvider,
  fieldKey: string
): Promise<{ value: string | null; confidence: number | null } | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select("value, confidence, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("domain", domain)
    .eq("provider", provider)
    .eq("field_key", fieldKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  return { value: data.value, confidence: data.confidence };
}

// ── Multi-field lookup ──

export async function lookupCacheMulti(
  workspaceId: string,
  domain: string,
  provider: EnricherProvider,
  fields: string[]
): Promise<Map<string, { value: string | null; confidence: number | null }>> {
  const supabase = createAdminClient();
  const result = new Map<
    string,
    { value: string | null; confidence: number | null }
  >();

  const { data, error } = await supabase
    .from(TABLE)
    .select("field_key, value, confidence, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("domain", domain)
    .eq("provider", provider)
    .in("field_key", fields)
    .gt("expires_at", new Date().toISOString());

  if (error || !data) return result;

  for (const row of data) {
    result.set(row.field_key, {
      value: row.value,
      confidence: row.confidence,
    });
  }

  return result;
}

// ── Single field store (upsert) ──

export async function storeCache(
  workspaceId: string,
  domain: string,
  provider: EnricherProvider,
  fieldKey: string,
  value: string | null,
  rawResponse?: Record<string, unknown>,
  confidence?: number,
  ttlDays = 30
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + ttlDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from(TABLE).upsert(
    {
      workspace_id: workspaceId,
      domain,
      provider,
      field_key: fieldKey,
      value,
      raw_response: rawResponse ?? null,
      confidence: confidence ?? null,
      fetched_at: now.toISOString(),
      expires_at: expiresAt,
    },
    {
      onConflict: "workspace_id,domain,provider,field_key",
    }
  );

  if (error) {
    console.error(`[cache] Failed to store cache for ${domain}/${fieldKey}:`, error);
  }
}

// ── Bulk store (upsert) ──

type CacheEntry = {
  fieldKey: string;
  value: string | null;
  rawResponse?: Record<string, unknown>;
  confidence?: number;
  ttlDays?: number;
};

export async function storeCacheMulti(
  workspaceId: string,
  domain: string,
  provider: EnricherProvider,
  entries: CacheEntry[]
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date();

  const rows = entries.map((entry) => {
    const ttl = entry.ttlDays ?? 30;
    const expiresAt = new Date(
      now.getTime() + ttl * 24 * 60 * 60 * 1000
    ).toISOString();

    return {
      workspace_id: workspaceId,
      domain,
      provider,
      field_key: entry.fieldKey,
      value: entry.value,
      raw_response: entry.rawResponse ?? null,
      confidence: entry.confidence ?? null,
      fetched_at: now.toISOString(),
      expires_at: expiresAt,
    };
  });

  const { error } = await supabase.from(TABLE).upsert(rows, {
    onConflict: "workspace_id,domain,provider,field_key",
  });

  if (error) {
    console.error(`[cache] Failed to bulk store cache for ${domain}:`, error);
  }
}

// ── Invalidate cache ──

export async function invalidateCache(
  workspaceId: string,
  domain?: string,
  provider?: EnricherProvider
): Promise<void> {
  const supabase = createAdminClient();

  let query = supabase.from(TABLE).delete().eq("workspace_id", workspaceId);

  if (domain) query = query.eq("domain", domain);
  if (provider) query = query.eq("provider", provider);

  const { error } = await query;

  if (error) {
    console.error("[cache] Failed to invalidate cache:", error);
  }
}

// ── Cache stats ──

export async function getCacheStats(workspaceId: string): Promise<{
  total_entries: number;
  expired_entries: number;
  hit_rate_estimate: number;
}> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const [totalRes, expiredRes] = await Promise.all([
    supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .lte("expires_at", now),
  ]);

  const total = totalRes.count ?? 0;
  const expired = expiredRes.count ?? 0;
  const active = total - expired;

  return {
    total_entries: total,
    expired_entries: expired,
    hit_rate_estimate: total > 0 ? active / total : 0,
  };
}
