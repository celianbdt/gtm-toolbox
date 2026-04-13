import type { EnricherConnector, EnrichmentField } from "../types";
import type { EnricherProvider } from "../../types";

import apolloConnector from "./apollo";
import icypeasConnector from "./icypeas";
import fullenrichConnector from "./fullenrich";
import dropcontactConnector from "./dropcontact";
import datagmaConnector from "./datagma";
import hunterConnector from "./hunter";
import clearbitConnector from "./clearbit";
import proxycurlConnector from "./proxycurl";
import brandfetchConnector from "./brandfetch";
import builtwithConnector from "./builtwith";
import wappalyzerConnector from "./wappalyzer";
import firecrawlConnector from "./firecrawl";
import serperConnector from "./serper";
import enrowConnector from "./enrow";
import magileadConnector from "./magilead";

const CONNECTORS: Record<EnricherProvider, EnricherConnector> = {
  apollo: apolloConnector,
  icypeas: icypeasConnector,
  fullenrich: fullenrichConnector,
  dropcontact: dropcontactConnector,
  datagma: datagmaConnector,
  hunter: hunterConnector,
  clearbit: clearbitConnector,
  proxycurl: proxycurlConnector,
  brandfetch: brandfetchConnector,
  builtwith: builtwithConnector,
  wappalyzer: wappalyzerConnector,
  firecrawl: firecrawlConnector,
  serper: serperConnector,
  enrow: enrowConnector,
  magilead: magileadConnector,
};

export function getConnector(provider: EnricherProvider): EnricherConnector {
  const connector = CONNECTORS[provider];
  if (!connector) {
    throw new Error(`Unknown enricher provider: ${provider}`);
  }
  return connector;
}

export function getAllConnectors(): EnricherConnector[] {
  return Object.values(CONNECTORS);
}

export function getConnectorsForField(
  field: EnrichmentField
): EnricherConnector[] {
  return Object.values(CONNECTORS).filter((c) =>
    c.supportedFields.includes(field)
  );
}
