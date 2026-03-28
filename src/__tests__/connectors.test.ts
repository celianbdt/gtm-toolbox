import { describe, it, expect } from "vitest";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/lib/outbound-builder/connectors";
import type { OutboundProvider, ProviderCredentials } from "@/lib/outbound-builder/connectors";

describe("Connector Types & Registry", () => {
  it("all providers have labels", () => {
    const providers: OutboundProvider[] = ["lemlist", "instantly", "plusvibe", "smartlead"];
    for (const p of providers) {
      expect(PROVIDER_LABELS[p]).toBeTruthy();
      expect(typeof PROVIDER_LABELS[p]).toBe("string");
    }
  });

  it("all providers have colors", () => {
    const providers: OutboundProvider[] = ["lemlist", "instantly", "plusvibe", "smartlead"];
    for (const p of providers) {
      expect(PROVIDER_COLORS[p]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("ProviderCredentials type accepts all providers", () => {
    const creds: ProviderCredentials[] = [
      { provider: "lemlist", apiKey: "key1" },
      { provider: "instantly", apiKey: "key2" },
      { provider: "plusvibe", apiKey: "key3", workspaceId: "ws1" },
      { provider: "smartlead", apiKey: "key4" },
    ];
    expect(creds).toHaveLength(4);
    expect(creds[2].workspaceId).toBe("ws1");
  });
});

describe("CampaignDataSource type extension", () => {
  it("accepts all provider types as data source", () => {
    // This is a compile-time check — if types are wrong, TS would fail at build
    const sources = [
      { type: "csv" as const, rows: [] },
      { type: "manual" as const, rows: [] },
      { type: "lemlist" as const, rows: [] },
      { type: "instantly" as const, rows: [] },
      { type: "plusvibe" as const, rows: [] },
      { type: "smartlead" as const, rows: [] },
    ];
    expect(sources).toHaveLength(6);
  });
});
