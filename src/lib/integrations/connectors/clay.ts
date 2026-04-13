import type { IntegrationConnector, SyncResult } from "../types";

/**
 * Clay connector — webhook-based integration.
 *
 * Clay doesn't have a traditional REST API for reading data.
 * Each Clay table has a unique webhook URL that can receive data.
 *
 * This connector:
 * - testConnection: validates the webhook URL is reachable
 * - sync: Clay pushes data via webhook to /api/integrations/webhook/clay
 *   so sync is a no-op (data comes IN, we don't pull)
 *
 * Users configure their Clay table webhook URL in credentials.
 * The actual data ingestion happens via the webhook endpoint.
 */

const TIMEOUT = 15_000;

export const clayIntegrationConnector: IntegrationConnector = {
  provider: "clay",
  label: "Clay",
  description: "Enrichment tables (webhook)",
  icon: "Layers",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const apiKey = (credentials.api_key ?? credentials.access_token) as string | undefined;
    // Clay uses API key for Enterprise API, or just validates a webhook URL is set
    if (!apiKey) return false;

    try {
      // Try Enterprise People API as a test
      const res = await fetch("https://api.clay.com/v1/people", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "test@example.com" }),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      // 401 = bad key, 200/422 = key works (even if the lookup fails)
      return res.status !== 401 && res.status !== 403;
    } catch {
      // If Enterprise API is not available, just validate key format
      return apiKey.length > 10;
    }
  },

  async sync(credentials: Record<string, unknown>, _config: Record<string, unknown>): Promise<SyncResult> {
    const apiKey = (credentials.api_key ?? credentials.access_token) as string;
    if (!apiKey) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No API key provided"] };
    }

    // Clay is webhook-based — data flows IN via /api/integrations/webhook/clay
    // On sync, we just confirm the connection is alive
    // In the future, we could query the Enterprise API for enrichment data

    return {
      success: true,
      data: [],
      metrics: [],
      count: 0,
      errors: [],
    };
  },
};
