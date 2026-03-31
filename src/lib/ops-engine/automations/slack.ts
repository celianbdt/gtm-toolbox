import type { OpsAutomation } from "../types";
import type {
  AutomationContext,
  AutomationResult,
  AutomationRunner,
} from "./types";
import { replaceTemplateVars } from "./utils";

const TIER_EMOJI: Record<string, string> = {
  priority: "⚡",
  hot: "🔥",
  warm: "🟡",
  cold: "🧊",
  ignored: "⬜",
};

function buildSlackBlocks(
  automation: OpsAutomation,
  context: AutomationContext,
): Record<string, unknown>[] {
  const { row, new_tier, previous_tier, table_name } = context;
  const data = row.data as Record<string, string | undefined>;
  const emoji = TIER_EMOJI[new_tier] ?? "📊";
  const companyName = data.company_name ?? data.name ?? row.domain ?? "Unknown";
  const config = automation.config as {
    message_template?: string;
    webhook_url?: string;
  };

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${companyName} → ${new_tier.toUpperCase()}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Table:*\n${table_name}`,
        },
        {
          type: "mrkdwn",
          text: `*Score:*\n${row.score_total}`,
        },
        {
          type: "mrkdwn",
          text: `*Tier Change:*\n${previous_tier} → ${new_tier}`,
        },
        {
          type: "mrkdwn",
          text: `*Domain:*\n${row.domain ?? "N/A"}`,
        },
      ],
    },
  ];

  // Signal source info
  if (row.source) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Signal:* ${row.source}`,
      },
    });
  }

  // Contact info if available
  const email = data.email ?? data.contact_email;
  const phone = data.phone ?? data.contact_phone;
  if (email || phone) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          email ? `*Email:* ${email}` : null,
          phone ? `*Phone:* ${phone}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      },
    });
  }

  // Custom message template
  if (config.message_template) {
    const resolved = replaceTemplateVars(config.message_template, row);
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: resolved },
    });
  }

  blocks.push({
    type: "divider",
  });

  return blocks;
}

export const slackRunner: AutomationRunner = {
  type: "slack_webhook",

  async execute(
    automation: OpsAutomation,
    context: AutomationContext,
  ): Promise<AutomationResult> {
    const config = automation.config as {
      webhook_url?: string;
      message_template?: string;
    };

    if (!config.webhook_url) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: "slack_webhook",
        message: "Missing webhook_url in automation config",
      };
    }

    const blocks = buildSlackBlocks(automation, context);
    const data = context.row.data as Record<string, string | undefined>;
    const companyName =
      data.company_name ?? data.name ?? context.row.domain ?? "Unknown";

    const payload = {
      text: `${companyName} moved to ${context.new_tier}`,
      blocks,
    };

    try {
      const res = await fetch(config.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          success: false,
          automation_id: automation.id,
          automation_type: "slack_webhook",
          message: `Slack webhook failed (${res.status}): ${body.slice(0, 200)}`,
        };
      }

      return {
        success: true,
        automation_id: automation.id,
        automation_type: "slack_webhook",
        message: `Slack notification sent for ${companyName}`,
      };
    } catch (err) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: "slack_webhook",
        message: `Slack webhook error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
