import type { OpsAutomation } from "../types";
import type {
  AutomationContext,
  AutomationResult,
  AutomationRunner,
} from "./types";

type EmailDigestConfig = {
  recipients?: string[];
  frequency?: "daily" | "weekly";
};

type DigestEntry = {
  row_id: string;
  domain: string | null;
  company_name: string;
  score: number;
  tier: string;
  previous_tier: string;
  source: string | null;
};

type DigestPayload = {
  workspace_id: string;
  table_name: string;
  frequency: string;
  recipients: string[];
  entries: DigestEntry[];
  generated_at: string;
};

export const emailDigestRunner: AutomationRunner = {
  type: "email_digest",

  async execute(
    automation: OpsAutomation,
    context: AutomationContext,
  ): Promise<AutomationResult> {
    const config = automation.config as EmailDigestConfig;

    if (!config.recipients || config.recipients.length === 0) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: "email_digest",
        message: "Missing recipients in automation config",
      };
    }

    const data = context.row.data as Record<string, string | undefined>;
    const companyName =
      data.company_name ?? data.name ?? context.row.domain ?? "Unknown";

    const entry: DigestEntry = {
      row_id: context.row.id,
      domain: context.row.domain,
      company_name: companyName,
      score: context.row.score_total,
      tier: context.new_tier,
      previous_tier: context.previous_tier,
      source: context.row.source,
    };

    const digest: DigestPayload = {
      workspace_id: context.workspace_id,
      table_name: context.table_name,
      frequency: config.frequency ?? "daily",
      recipients: config.recipients,
      entries: [entry],
      generated_at: new Date().toISOString(),
    };

    // For now, we compile the digest object. Actual email sending via Resend
    // will be added in a future sprint. The digest can be accumulated by a
    // cron job that collects all entries and sends a single email.

    return {
      success: true,
      automation_id: automation.id,
      automation_type: "email_digest",
      message: `Digest entry compiled for ${companyName} → ${config.recipients.length} recipient(s)`,
      response_data: digest as unknown as Record<string, unknown>,
    };
  },
};
