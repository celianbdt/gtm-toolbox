import type { CrmConnector, CrmProvider } from "./types";
import { hubspotConnector } from "./hubspot";
import { attioConnector } from "./attio";
import { pipedriveConnector } from "./pipedrive";
import { folkConnector } from "./folk";

export type { CrmProvider, CrmConnector, CrmConnectionConfig, CrmRecord, CrmImportResult } from "./types";

const CONNECTORS: Record<CrmProvider, CrmConnector> = {
  hubspot: hubspotConnector,
  attio: attioConnector,
  pipedrive: pipedriveConnector,
  folk: folkConnector,
};

const PROVIDER_LABELS: Record<CrmProvider, string> = {
  hubspot: "HubSpot",
  attio: "Attio",
  pipedrive: "Pipedrive",
  folk: "Folk",
};

export function getCrmConnector(provider: CrmProvider): CrmConnector {
  const connector = CONNECTORS[provider];
  if (!connector) {
    throw new Error(`Unknown CRM provider: ${provider}`);
  }
  return connector;
}

export function getAllCrmProviders(): { provider: CrmProvider; label: string }[] {
  return (Object.keys(CONNECTORS) as CrmProvider[]).map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider],
  }));
}
