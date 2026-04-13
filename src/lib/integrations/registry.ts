import type { IntegrationProvider, IntegrationConnector } from "./types";
import { hubspotIntegrationConnector } from "./connectors/hubspot";
import { notionIntegrationConnector } from "./connectors/notion";
import { pipedriveIntegrationConnector } from "./connectors/pipedrive";
import { slackIntegrationConnector } from "./connectors/slack";
import { attioIntegrationConnector } from "./connectors/attio";
import { folkIntegrationConnector } from "./connectors/folk";

const CONNECTORS: Partial<Record<IntegrationProvider, IntegrationConnector>> = {
  hubspot: hubspotIntegrationConnector,
  notion: notionIntegrationConnector,
  pipedrive: pipedriveIntegrationConnector,
  slack: slackIntegrationConnector,
  attio: attioIntegrationConnector,
  folk: folkIntegrationConnector,
};

export function getIntegrationConnector(provider: IntegrationProvider): IntegrationConnector {
  const connector = CONNECTORS[provider];
  if (!connector) {
    throw new Error(`No connector implemented for provider: ${provider}`);
  }
  return connector;
}

export function getAllProviders(): IntegrationProvider[] {
  return Object.keys(CONNECTORS) as IntegrationProvider[];
}
