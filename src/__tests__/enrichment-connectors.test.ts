import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock enrichFetch so connectors never make real HTTP calls
vi.mock("@/lib/ops-engine/enrichment/http", () => ({
  enrichFetch: vi.fn().mockResolvedValue({
    ok: false,
    status: 401,
    data: null,
    error: "Unauthorized",
  }),
}));

import {
  getConnector,
  getAllConnectors,
} from "@/lib/ops-engine/enrichment/connectors/index";

const ALL_PROVIDERS = [
  "apollo",
  "hunter",
  "clearbit",
  "dropcontact",
  "proxycurl",
  "fullenrich",
  "icypeas",
  "datagma",
  "brandfetch",
  "builtwith",
  "wappalyzer",
  "firecrawl",
  "serper",
  "enrow",
  "magilead",
] as const;

describe("Enrichment connectors registry", () => {
  it("getAllConnectors() returns 15 connectors", () => {
    const connectors = getAllConnectors();
    expect(connectors).toHaveLength(15);
  });

  it("getConnector('apollo') returns the apollo connector", () => {
    const connector = getConnector("apollo");
    expect(connector.provider).toBe("apollo");
  });

  it("getConnector('unknown') throws an error", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getConnector("unknown" as any)).toThrowError(
      /unknown enricher provider/i
    );
  });
});

describe.each(ALL_PROVIDERS)("Connector: %s", (providerName) => {
  it("has correct provider field", () => {
    const connector = getConnector(providerName);
    expect(connector.provider).toBe(providerName);
  });

  it("has supportedFields with at least 1 field", () => {
    const connector = getConnector(providerName);
    expect(connector.supportedFields.length).toBeGreaterThanOrEqual(1);
  });

  it("has estimatedCostPerCall >= 0", () => {
    const connector = getConnector(providerName);
    expect(connector.estimatedCostPerCall).toBeGreaterThanOrEqual(0);
    expect(typeof connector.estimatedCostPerCall).toBe("number");
  });

  it("enrich() with empty apiKey returns a valid EnrichmentResult shape", async () => {
    const connector = getConnector(providerName);
    const result = await connector.enrich(
      { domain: "test.com", fields: ["email"] },
      ""
    );

    // Verify shape
    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("raw_response");
    expect(result).toHaveProperty("credits_used");

    expect(typeof result.provider).toBe("string");
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.data).toBe("object");
    expect(typeof result.confidence).toBe("object");
    expect(typeof result.raw_response).toBe("object");
    expect(typeof result.credits_used).toBe("number");
  });
});
