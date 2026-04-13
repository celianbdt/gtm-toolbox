import { describe, it, expect } from "vitest";

import { hubspotIntegrationConnector } from "@/lib/integrations/connectors/hubspot";
import { pipedriveIntegrationConnector } from "@/lib/integrations/connectors/pipedrive";
import { slackIntegrationConnector } from "@/lib/integrations/connectors/slack";
import { notionIntegrationConnector } from "@/lib/integrations/connectors/notion";
import { attioIntegrationConnector } from "@/lib/integrations/connectors/attio";
import { folkIntegrationConnector } from "@/lib/integrations/connectors/folk";
import { lemlistIntegrationConnector } from "@/lib/integrations/connectors/lemlist";
import { instantlyIntegrationConnector } from "@/lib/integrations/connectors/instantly";
import { smartleadIntegrationConnector } from "@/lib/integrations/connectors/smartlead";
import { plusvibeIntegrationConnector } from "@/lib/integrations/connectors/plusvibe";
import { clayIntegrationConnector } from "@/lib/integrations/connectors/clay";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ConnectorMeta = {
  connector: {
    provider: string;
    label: string;
    description: string;
    icon: string;
    testConnection: (creds: Record<string, unknown>) => Promise<boolean>;
    sync: (creds: Record<string, unknown>, config: Record<string, unknown>) => Promise<{
      success: boolean;
      data: unknown[];
      metrics: unknown[];
      count: number;
      errors: string[];
    }>;
  };
  provider: string;
  label: string;
  description: string;
  icon: string;
};

const connectors: ConnectorMeta[] = [
  {
    connector: hubspotIntegrationConnector,
    provider: "hubspot",
    label: "HubSpot",
    description: "Deals, contacts, email activity",
    icon: "Building2",
  },
  {
    connector: pipedriveIntegrationConnector,
    provider: "pipedrive",
    label: "Pipedrive",
    description: "Deals pipeline, activities",
    icon: "Target",
  },
  {
    connector: slackIntegrationConnector,
    provider: "slack",
    label: "Slack",
    description: "Channel messages, send reports",
    icon: "MessageSquare",
  },
  {
    connector: notionIntegrationConnector,
    provider: "notion",
    label: "Notion",
    description: "Pages, databases",
    icon: "BookOpen",
  },
  {
    connector: attioIntegrationConnector,
    provider: "attio",
    label: "Attio",
    description: "Records, notes, activity",
    icon: "Database",
  },
  {
    connector: folkIntegrationConnector,
    provider: "folk",
    label: "Folk",
    description: "Contacts, companies",
    icon: "Users",
  },
  {
    connector: lemlistIntegrationConnector,
    provider: "lemlist",
    label: "Lemlist",
    description: "Campagnes outbound, stats, leads",
    icon: "Send",
  },
  {
    connector: instantlyIntegrationConnector,
    provider: "instantly",
    label: "Instantly",
    description: "Cold email campaigns, analytics",
    icon: "Zap",
  },
  {
    connector: smartleadIntegrationConnector,
    provider: "smartlead",
    label: "SmartLead",
    description: "Email campaigns, lead management",
    icon: "BarChart3",
  },
  {
    connector: plusvibeIntegrationConnector,
    provider: "plusvibe",
    label: "PlusVibe",
    description: "Multi-channel sequences, analytics",
    icon: "Activity",
  },
  {
    connector: clayIntegrationConnector,
    provider: "clay",
    label: "Clay",
    description: "Enrichment tables (webhook)",
    icon: "Layers",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Integration connectors", () => {
  for (const { connector, provider, label, description, icon } of connectors) {
    describe(`${label} connector`, () => {
      // ── Metadata ──

      it("has correct provider", () => {
        expect(connector.provider).toBe(provider);
      });

      it("has correct label", () => {
        expect(connector.label).toBe(label);
      });

      it("has correct description", () => {
        expect(connector.description).toBe(description);
      });

      it("has correct icon", () => {
        expect(connector.icon).toBe(icon);
      });

      // ── testConnection without credentials ──

      it("testConnection returns false without token", async () => {
        const result = await connector.testConnection({});
        expect(result).toBe(false);
      });

      // ── sync without credentials ──

      it("sync returns error without token", async () => {
        const result = await connector.sync({}, {});
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      // ── SyncResult shape ──

      it("sync returns correct SyncResult shape", async () => {
        const result = await connector.sync({}, {});
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("data");
        expect(result).toHaveProperty("metrics");
        expect(result).toHaveProperty("count");
        expect(result).toHaveProperty("errors");
        expect(typeof result.success).toBe("boolean");
        expect(Array.isArray(result.data)).toBe(true);
        expect(Array.isArray(result.metrics)).toBe(true);
        expect(typeof result.count).toBe("number");
        expect(Array.isArray(result.errors)).toBe(true);
      });
    });
  }
});
