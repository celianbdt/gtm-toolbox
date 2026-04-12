import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationConnector } from "./registry";
import type { Integration } from "./types";

/**
 * Orchestrates a full sync for a given integration.
 * 1. Fetch integration from DB
 * 2. Set status to 'syncing'
 * 3. Call connector.sync()
 * 4. Store raw data in integration_data (delete old + insert new)
 * 5. Transform metrics → upsert into workspace_metrics
 * 6. Update integration status to 'connected' + last_sync_at
 * 7. On error: set status to 'error' + error_message
 */
export async function syncIntegration(integrationId: string): Promise<void> {
  const supabase = createAdminClient();

  // 1. Fetch integration
  const { data: integration, error: fetchError } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .single();

  if (fetchError || !integration) {
    throw new Error(`Integration not found: ${integrationId}`);
  }

  const int = integration as Integration;

  // 2. Set status to syncing
  await supabase
    .from("integrations")
    .update({ status: "syncing", error_message: null })
    .eq("id", integrationId);

  try {
    const connector = getIntegrationConnector(int.provider);

    // 3. Run sync
    const result = await connector.sync(int.credentials, int.config);

    // 4. Delete old integration_data and insert new
    await supabase
      .from("integration_data")
      .delete()
      .eq("workspace_id", int.workspace_id)
      .eq("provider", int.provider);

    if (result.data.length > 0) {
      // Insert in batches of 500
      const batchSize = 500;
      for (let i = 0; i < result.data.length; i += batchSize) {
        const batch = result.data.slice(i, i + batchSize).map((d) => ({
          workspace_id: int.workspace_id,
          provider: int.provider,
          data_type: d.data_type,
          raw_data: d.raw_data,
          synced_at: new Date().toISOString(),
        }));
        const { error: insertError } = await supabase
          .from("integration_data")
          .insert(batch);
        if (insertError) {
          console.error("Failed to insert integration_data batch:", insertError);
        }
      }
    }

    // 5. Upsert metrics into workspace_metrics
    if (result.metrics.length > 0) {
      const now = new Date();
      // Week date = Monday of current week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const weekDate = new Date(now.setDate(diff)).toISOString().split("T")[0];

      const metricsPayload = result.metrics.map((m) => ({
        workspace_id: int.workspace_id,
        metric_name: m.metric_name,
        metric_value: m.metric_value,
        week_date: weekDate,
      }));

      const { error: metricsError } = await supabase
        .from("workspace_metrics")
        .upsert(metricsPayload, { onConflict: "workspace_id,metric_name,week_date" });

      if (metricsError) {
        console.error("Failed to upsert workspace_metrics:", metricsError);
      }
    }

    // 6. Update integration status
    const now = new Date().toISOString();
    await supabase
      .from("integrations")
      .update({
        status: result.success ? "connected" : "error",
        last_sync_at: now,
        error_message: result.errors.length > 0 ? result.errors.join("; ") : null,
      })
      .eq("id", integrationId);

  } catch (err) {
    // 7. On error: set status to 'error'
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await supabase
      .from("integrations")
      .update({ status: "error", error_message: message })
      .eq("id", integrationId);
    throw err;
  }
}
