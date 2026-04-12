import { inngest } from "@/lib/ops-engine/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncIntegration } from "../sync";

// ── 1. On-demand sync triggered by event ──

export const integrationSyncJob = inngest.createFunction(
  {
    id: "integration-sync",
    name: "Integration Sync",
    concurrency: { limit: 3 },
    triggers: [{ event: "integration/sync.requested" }],
  },
  async ({ event, step }: { event: { data: { integration_id: string } }; step: any }) => {
    const { integration_id } = event.data;

    await step.run("sync-integration", async () => {
      await syncIntegration(integration_id);
    });

    return { status: "completed", integration_id };
  }
);

// ── 2. Daily cron: sync all connected integrations at 08:00 UTC ──

export const dailyIntegrationSyncJob = inngest.createFunction(
  {
    id: "daily-integration-sync",
    name: "Daily Integration Sync",
    triggers: [{ cron: "0 8 * * *" }],
  },
  async ({ step }: { step: any }) => {
    const supabase = createAdminClient();

    const integrations = await step.run("fetch-connected-integrations", async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("id, workspace_id, provider")
        .eq("status", "connected");
      if (error) throw error;
      return data ?? [];
    });

    // Emit a sync event for each connected integration
    const events = integrations.map((int: { id: string; workspace_id: string; provider: string }) => ({
      name: "integration/sync.requested" as const,
      data: {
        integration_id: int.id,
        workspace_id: int.workspace_id,
        provider: int.provider,
      },
    }));

    if (events.length > 0) {
      await step.sendEvent("emit-sync-events", events);
    }

    return { status: "dispatched", count: events.length };
  }
);
