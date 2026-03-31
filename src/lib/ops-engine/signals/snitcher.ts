import type { SignalSourceHandler, SignalResult } from "./types";

/**
 * Snitcher Signal Source
 *
 * Real API: GET https://api.snitcher.com/v2/sessions
 * Auth: Bearer token
 *
 * Snitcher identifies anonymous website visitors by matching IP addresses
 * to company data. Useful for detecting intent from companies browsing
 * your website/pricing page.
 *
 * Filters supported:
 * - date_from: ISO date string
 * - date_to: ISO date string
 * - min_page_views: minimum pages visited per session
 * - exclude_isps: boolean — filter out ISP traffic
 *
 * Returns: domain, company_name, pages_visited, visit_count, referrer
 */
export const snitcherHandler: SignalSourceHandler = {
  source: "snitcher",

  async harvest(
    filters: Record<string, unknown>,
    _apiKey?: string
  ): Promise<SignalResult[]> {
    // TODO: Replace with real Snitcher API call
    // const params = new URLSearchParams({
    //   date_from: filters.date_from as string ?? new Date(Date.now() - 86400000).toISOString().split("T")[0],
    //   date_to: filters.date_to as string ?? new Date().toISOString().split("T")[0],
    // });
    // const response = await fetch(`https://api.snitcher.com/v2/sessions?${params}`, {
    //   headers: { Authorization: `Bearer ${apiKey}` },
    // });
    // const sessions = await response.json();
    // Group sessions by company, aggregate page views, filter ISPs

    const minPageViews = (filters.min_page_views as number) ?? 2;

    console.log(
      `[snitcher] Stub harvest — min_page_views: ${minPageViews}`
    );

    // Realistic mock results — companies that visited your website
    const mockResults: SignalResult[] = [
      {
        domain: "doctolib.fr",
        data: {
          company_name: "Doctolib",
          pages_visited: ["/pricing", "/features/integrations", "/demo"],
          visit_count: 5,
          referrer: "google.com",
          country: "France",
          employee_count: 2800,
          industry: "HealthTech",
        },
        source_meta: {
          snitcher_session_id: "sn-sess-001",
          first_seen: "2024-11-25T10:30:00Z",
          last_seen: "2024-11-28T14:15:00Z",
          ip_country: "FR",
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "alan.com",
        data: {
          company_name: "Alan",
          pages_visited: ["/pricing", "/case-studies"],
          visit_count: 3,
          referrer: "linkedin.com",
          country: "France",
          employee_count: 550,
          industry: "InsurTech",
        },
        source_meta: {
          snitcher_session_id: "sn-sess-002",
          first_seen: "2024-11-26T09:00:00Z",
          last_seen: "2024-11-27T16:45:00Z",
          ip_country: "FR",
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "swile.co",
        data: {
          company_name: "Swile",
          pages_visited: ["/", "/pricing", "/features/api", "/blog/abm-guide"],
          visit_count: 8,
          referrer: "direct",
          country: "France",
          employee_count: 700,
          industry: "HR Tech",
        },
        source_meta: {
          snitcher_session_id: "sn-sess-003",
          first_seen: "2024-11-24T08:00:00Z",
          last_seen: "2024-11-28T11:30:00Z",
          ip_country: "FR",
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
    ];

    return mockResults;
  },
};
