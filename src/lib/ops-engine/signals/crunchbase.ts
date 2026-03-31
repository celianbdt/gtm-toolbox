import type { SignalSourceHandler, SignalResult } from "./types";

/**
 * Crunchbase Signal Source
 *
 * Real API: POST https://api.crunchbase.com/api/v4/searches/organizations
 * Auth: X-cb-user-key header
 *
 * Filters supported:
 * - country: ISO country code (e.g. "FRA", "USA")
 * - funding_round_type: "seed", "series_a", "series_b", etc.
 * - funding_date_after: ISO date string — only return orgs funded after this date
 *
 * Returns: domain, company_name, funding_amount, funding_date, investors, round_type
 */
export const crunchbaseHandler: SignalSourceHandler = {
  source: "crunchbase",

  async harvest(
    filters: Record<string, unknown>,
    _apiKey?: string
  ): Promise<SignalResult[]> {
    // TODO: Replace with real Crunchbase API call
    // const response = await fetch("https://api.crunchbase.com/api/v4/searches/organizations", {
    //   method: "POST",
    //   headers: {
    //     "X-cb-user-key": apiKey,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     field_ids: ["identifier", "short_description", "funding_total", "last_funding_at", "website_url"],
    //     query: [
    //       { type: "predicate", field_id: "location_identifiers", operator_id: "includes", values: [filters.country] },
    //       { type: "predicate", field_id: "last_funding_type", operator_id: "eq", values: [filters.funding_round_type] },
    //       { type: "predicate", field_id: "last_funding_at", operator_id: "gte", values: [filters.funding_date_after] },
    //     ],
    //     limit: 50,
    //   }),
    // });

    const country = (filters.country as string) ?? "FRA";
    const roundType = (filters.funding_round_type as string) ?? "seed";

    console.log(
      `[crunchbase] Stub harvest — country: ${country}, round: ${roundType}`
    );

    // Realistic mock results
    const mockResults: SignalResult[] = [
      {
        domain: "mistral.ai",
        data: {
          company_name: "Mistral AI",
          funding_amount: 113_000_000,
          funding_date: "2024-06-11",
          investors: ["Andreessen Horowitz", "Lightspeed", "BPI France"],
          round_type: "series_a",
          industry: "Artificial Intelligence",
          employee_count: 45,
        },
        source_meta: {
          crunchbase_uuid: "cb-mistral-001",
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "pennylane.com",
        data: {
          company_name: "Pennylane",
          funding_amount: 40_000_000,
          funding_date: "2024-03-15",
          investors: ["Sequoia Capital", "Global Founders Capital"],
          round_type: "series_b",
          industry: "FinTech",
          employee_count: 250,
        },
        source_meta: {
          crunchbase_uuid: "cb-pennylane-002",
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "dust.tt",
        data: {
          company_name: "Dust",
          funding_amount: 16_000_000,
          funding_date: "2024-05-20",
          investors: ["Sequoia Capital", "XYZ Venture Capital"],
          round_type: "seed",
          industry: "AI Infrastructure",
          employee_count: 20,
        },
        source_meta: {
          crunchbase_uuid: "cb-dust-003",
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "qonto.com",
        data: {
          company_name: "Qonto",
          funding_amount: 486_000_000,
          funding_date: "2024-01-10",
          investors: ["Tiger Global", "DST Global", "Tencent"],
          round_type: "series_d",
          industry: "FinTech",
          employee_count: 1400,
        },
        source_meta: {
          crunchbase_uuid: "cb-qonto-004",
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
    ];

    return mockResults;
  },
};
