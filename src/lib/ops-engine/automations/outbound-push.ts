import type { OpsAutomation } from "../types";
import type {
  AutomationContext,
  AutomationResult,
  AutomationRunner,
} from "./types";
import { mapFields } from "./utils";

type OutboundProvider = "lemlist" | "instantly" | "smartlead";

type OutboundConfig = {
  provider?: OutboundProvider;
  api_key?: string;
  campaign_id?: string;
  field_mapping?: Record<string, string>;
};

function buildLemlistPayload(
  mapped: Record<string, unknown>,
): Record<string, unknown> {
  return {
    email: mapped.email ?? "",
    firstName: mapped.firstName ?? mapped.first_name ?? "",
    lastName: mapped.lastName ?? mapped.last_name ?? "",
    companyName: mapped.companyName ?? mapped.company_name ?? "",
    ...mapped,
  };
}

function buildInstantlyPayload(
  mapped: Record<string, unknown>,
  campaignId: string,
): Record<string, unknown> {
  return {
    campaign_id: campaignId,
    email: mapped.email ?? "",
    first_name: mapped.first_name ?? mapped.firstName ?? "",
    last_name: mapped.last_name ?? mapped.lastName ?? "",
    company_name: mapped.company_name ?? mapped.companyName ?? "",
    custom_variables: mapped,
  };
}

function buildSmartleadPayload(
  mapped: Record<string, unknown>,
): Record<string, unknown> {
  return {
    email: mapped.email ?? "",
    first_name: mapped.first_name ?? mapped.firstName ?? "",
    last_name: mapped.last_name ?? mapped.lastName ?? "",
    company: mapped.company ?? mapped.company_name ?? "",
    custom_fields: mapped,
  };
}

async function pushToLemlist(
  apiKey: string,
  campaignId: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  const encoded = Buffer.from(`:${apiKey}`).toString("base64");
  return fetch(
    `https://api.lemlist.com/api/campaigns/${campaignId}/leads`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    },
  );
}

async function pushToInstantly(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  return fetch("https://api.instantly.ai/api/v2/leads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
}

async function pushToSmartlead(
  apiKey: string,
  campaignId: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  return fetch(
    `https://server.smartlead.ai/api/v1/campaigns/${campaignId}/leads?api_key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    },
  );
}

export const outboundPushRunner: AutomationRunner = {
  type: "outbound_push",

  async execute(
    automation: OpsAutomation,
    context: AutomationContext,
  ): Promise<AutomationResult> {
    const config = automation.config as OutboundConfig;
    const automationType = automation.automation_type;

    // Determine provider from automation_type or config
    const provider: OutboundProvider | undefined =
      config.provider ??
      (automationType === "lemlist_push"
        ? "lemlist"
        : automationType === "instantly_push"
          ? "instantly"
          : automationType === "smartlead_push"
            ? "smartlead"
            : undefined);

    if (!provider) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: automationType,
        message: "Missing or unknown provider in automation config",
      };
    }

    if (!config.api_key) {
      // Realistic stub: log instead of calling
      const mapped = config.field_mapping
        ? mapFields(context.row, config.field_mapping)
        : { email: context.row.data.email, domain: context.row.domain };

      console.log(
        `[Outbound STUB] Would push lead to ${provider} for row ${context.row.id}`,
        { mapped, campaign_id: config.campaign_id },
      );

      return {
        success: true,
        automation_id: automation.id,
        automation_type: automationType,
        message: `${provider} push skipped (no api_key) — logged payload to console`,
        response_data: { stubbed: true, provider, mapped },
      };
    }

    if (!config.campaign_id) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: automationType,
        message: `Missing campaign_id for ${provider} push`,
      };
    }

    const mapped = config.field_mapping
      ? mapFields(context.row, config.field_mapping)
      : {};

    try {
      let res: Response;

      switch (provider) {
        case "lemlist": {
          const payload = buildLemlistPayload(mapped);
          res = await pushToLemlist(config.api_key, config.campaign_id, payload);
          break;
        }
        case "instantly": {
          const payload = buildInstantlyPayload(mapped, config.campaign_id);
          res = await pushToInstantly(config.api_key, payload);
          break;
        }
        case "smartlead": {
          const payload = buildSmartleadPayload(mapped);
          res = await pushToSmartlead(
            config.api_key,
            config.campaign_id,
            payload,
          );
          break;
        }
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          success: false,
          automation_id: automation.id,
          automation_type: automationType,
          message: `${provider} push failed (${res.status}): ${body.slice(0, 200)}`,
        };
      }

      const responseData = await res.json().catch(() => ({}));

      return {
        success: true,
        automation_id: automation.id,
        automation_type: automationType,
        message: `Lead pushed to ${provider} campaign ${config.campaign_id}`,
        response_data: responseData as Record<string, unknown>,
      };
    } catch (err) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: automationType,
        message: `${provider} push error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
