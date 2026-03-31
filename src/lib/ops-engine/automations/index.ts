import { createAdminClient } from "@/lib/supabase/admin";
import type { OpsAutomation, OpsRow, ThresholdTier } from "../types";
import type {
  AutomationContext,
  AutomationResult,
  AutomationRunner,
} from "./types";
import { slackRunner } from "./slack";
import { hubspotRunner } from "./hubspot";
import { outboundPushRunner } from "./outbound-push";
import { webhookRunner } from "./webhook";
import { emailDigestRunner } from "./email-digest";

// ── Runner Registry ──

const runners: Record<string, AutomationRunner> = {
  slack_webhook: slackRunner,
  hubspot_push: hubspotRunner,
  lemlist_push: outboundPushRunner,
  instantly_push: outboundPushRunner,
  smartlead_push: outboundPushRunner,
  custom_webhook: webhookRunner,
  email_digest: emailDigestRunner,
};

// ── Public API ──

export async function executeAutomation(
  automation: OpsAutomation,
  context: AutomationContext,
): Promise<AutomationResult> {
  const runner = runners[automation.automation_type];

  if (!runner) {
    return {
      success: false,
      automation_id: automation.id,
      automation_type: automation.automation_type,
      message: `Unknown automation type: ${automation.automation_type}`,
    };
  }

  return runner.execute(automation, context);
}

export async function executeAutomationsForTier(
  tableId: string,
  row: OpsRow,
  newTier: ThresholdTier,
  previousTier: ThresholdTier,
): Promise<AutomationResult[]> {
  const supabase = createAdminClient();

  // Fetch all active automations for this table where trigger_tier matches
  const { data: automations, error } = await supabase
    .from("ops_automations")
    .select("*")
    .eq("table_id", tableId)
    .eq("trigger_tier", newTier)
    .eq("is_active", true);

  if (error) {
    return [
      {
        success: false,
        automation_id: "system",
        automation_type: "system",
        message: `Failed to fetch automations: ${error.message}`,
      },
    ];
  }

  if (!automations || automations.length === 0) {
    return [];
  }

  // Fetch table name for context
  const { data: table } = await supabase
    .from("ops_tables")
    .select("name, workspace_id")
    .eq("id", tableId)
    .single();

  const context: AutomationContext = {
    row,
    table_name: table?.name ?? "Unknown",
    workspace_id: table?.workspace_id ?? "",
    previous_tier: previousTier,
    new_tier: newTier,
  };

  // Execute all automations
  const results = await Promise.allSettled(
    (automations as OpsAutomation[]).map((automation) =>
      executeAutomation(automation, context),
    ),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      success: false,
      automation_id: automations[index]?.id ?? "unknown",
      automation_type: automations[index]?.automation_type ?? "unknown",
      message: `Automation execution rejected: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
    };
  });
}

// Re-exports
export type { AutomationContext, AutomationResult, AutomationRunner } from "./types";
