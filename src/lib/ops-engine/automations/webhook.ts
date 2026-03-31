import type { OpsAutomation } from "../types";
import type {
  AutomationContext,
  AutomationResult,
  AutomationRunner,
} from "./types";
import { replaceTemplateVars } from "./utils";

type WebhookConfig = {
  url?: string;
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
  body_template?: string;
};

export const webhookRunner: AutomationRunner = {
  type: "custom_webhook",

  async execute(
    automation: OpsAutomation,
    context: AutomationContext,
  ): Promise<AutomationResult> {
    const config = automation.config as WebhookConfig;

    if (!config.url) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: "custom_webhook",
        message: "Missing url in automation config",
      };
    }

    const method = config.method ?? "POST";

    // Build body: use template if provided, else send row data as JSON
    let body: string;
    if (config.body_template) {
      body = replaceTemplateVars(config.body_template, context.row);
    } else {
      body = JSON.stringify({
        row_id: context.row.id,
        domain: context.row.domain,
        score: context.row.score_total,
        tier: context.new_tier,
        previous_tier: context.previous_tier,
        table_name: context.table_name,
        workspace_id: context.workspace_id,
        data: context.row.data,
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(config.headers ?? {}),
    };

    try {
      const res = await fetch(config.url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const responseBody = await res.text().catch(() => "");

      if (!res.ok) {
        return {
          success: false,
          automation_id: automation.id,
          automation_type: "custom_webhook",
          message: `Webhook ${method} ${config.url} failed (${res.status}): ${responseBody.slice(0, 200)}`,
        };
      }

      return {
        success: true,
        automation_id: automation.id,
        automation_type: "custom_webhook",
        message: `Webhook ${method} ${config.url} returned ${res.status}`,
        response_data: {
          status: res.status,
          body: responseBody.slice(0, 1000),
        },
      };
    } catch (err) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: "custom_webhook",
        message: `Webhook error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
