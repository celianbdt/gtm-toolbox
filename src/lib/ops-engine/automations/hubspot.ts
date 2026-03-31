import type { OpsAutomation } from "../types";
import type {
  AutomationContext,
  AutomationResult,
  AutomationRunner,
} from "./types";
import { mapFields } from "./utils";

const HUBSPOT_API = "https://api.hubapi.com/crm/v3/objects";

type HubSpotConfig = {
  access_token?: string;
  pipeline_id?: string;
  stage_id?: string;
  field_mapping?: Record<string, string>;
  company_field_mapping?: Record<string, string>;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function searchContactByEmail(
  token: string,
  email: string,
): Promise<string | null> {
  const res = await fetch(`${HUBSPOT_API}/contacts/search`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: "email", operator: "EQ", value: email },
          ],
        },
      ],
      limit: 1,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { results?: { id: string }[] };
  return data.results?.[0]?.id ?? null;
}

async function createOrUpdateContact(
  token: string,
  properties: Record<string, unknown>,
  email: string | undefined,
): Promise<{ id: string; created: boolean }> {
  // Try to find existing contact by email first
  if (email) {
    const existingId = await searchContactByEmail(token, email);
    if (existingId) {
      const res = await fetch(`${HUBSPOT_API}/contacts/${existingId}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ properties }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `HubSpot contact update failed (${res.status}): ${body.slice(0, 200)}`,
        );
      }

      return { id: existingId, created: false };
    }
  }

  // Create new contact
  const res = await fetch(`${HUBSPOT_API}/contacts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ properties }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HubSpot contact create failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id, created: true };
}

async function createOrUpdateCompany(
  token: string,
  properties: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(`${HUBSPOT_API}/companies`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ properties }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HubSpot company create failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

async function associateContactToCompany(
  token: string,
  contactId: string,
  companyId: string,
): Promise<void> {
  const res = await fetch(
    `${HUBSPOT_API}/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
    {
      method: "PUT",
      headers: authHeaders(token),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `HubSpot association failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }
}

export const hubspotRunner: AutomationRunner = {
  type: "hubspot_push",

  async execute(
    automation: OpsAutomation,
    context: AutomationContext,
  ): Promise<AutomationResult> {
    const config = automation.config as HubSpotConfig;

    if (!config.access_token) {
      // Realistic stub: log instead of calling
      const contactProps = config.field_mapping
        ? mapFields(context.row, config.field_mapping)
        : {};
      const companyProps = config.company_field_mapping
        ? mapFields(context.row, config.company_field_mapping)
        : {};

      console.log(
        `[HubSpot STUB] Would push contact/company for row ${context.row.id}`,
        { contactProps, companyProps, pipeline_id: config.pipeline_id },
      );

      return {
        success: true,
        automation_id: automation.id,
        automation_type: "hubspot_push",
        message:
          "HubSpot push skipped (no access_token) — logged payload to console",
        response_data: { stubbed: true, contactProps, companyProps },
      };
    }

    if (!config.field_mapping) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: "hubspot_push",
        message: "Missing field_mapping in automation config",
      };
    }

    try {
      const contactProperties = mapFields(context.row, config.field_mapping);
      const email = (contactProperties.email ??
        context.row.data.email) as string | undefined;

      // Create or update contact
      const contact = await createOrUpdateContact(
        config.access_token,
        contactProperties,
        email,
      );

      // Create company if we have company mapping
      let companyId: string | undefined;
      if (config.company_field_mapping) {
        const companyProperties = mapFields(
          context.row,
          config.company_field_mapping,
        );
        if (Object.keys(companyProperties).length > 0) {
          companyId = await createOrUpdateCompany(
            config.access_token,
            companyProperties,
          );

          // Associate contact to company
          await associateContactToCompany(
            config.access_token,
            contact.id,
            companyId,
          );
        }
      }

      return {
        success: true,
        automation_id: automation.id,
        automation_type: "hubspot_push",
        message: `HubSpot: contact ${contact.created ? "created" : "updated"} (${contact.id})${companyId ? `, company created (${companyId})` : ""}`,
        response_data: {
          contact_id: contact.id,
          contact_created: contact.created,
          company_id: companyId,
        },
      };
    } catch (err) {
      return {
        success: false,
        automation_id: automation.id,
        automation_type: "hubspot_push",
        message: `HubSpot error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};
