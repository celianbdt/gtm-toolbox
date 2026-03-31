import type { SignalSourceHandler, SignalResult } from "./types";

/**
 * LinkedIn Jobs Signal Source (via Serper API)
 *
 * Real API: POST https://google.serper.dev/search
 * Auth: X-API-KEY header
 *
 * Strategy: Search "site:linkedin.com/jobs" with keywords to find
 * companies actively hiring for specific roles (signals buying intent).
 *
 * Filters supported:
 * - keywords: search terms (e.g. "Head of Revenue Operations")
 * - location: geographic filter (e.g. "France")
 * - posted_within: "day", "week", "month"
 *
 * Returns: domain, company_name, job_title, job_department, posted_date
 */
export const linkedinJobsHandler: SignalSourceHandler = {
  source: "linkedin_jobs",

  async harvest(
    filters: Record<string, unknown>,
    _apiKey?: string
  ): Promise<SignalResult[]> {
    // TODO: Replace with real Serper API call
    // const query = `site:linkedin.com/jobs ${filters.keywords}`;
    // const response = await fetch("https://google.serper.dev/search", {
    //   method: "POST",
    //   headers: {
    //     "X-API-KEY": apiKey,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     q: query,
    //     gl: filters.location === "France" ? "fr" : "us",
    //     num: 20,
    //   }),
    // });
    // Parse LinkedIn job URLs from organic results to extract company domains

    const keywords = (filters.keywords as string) ?? "RevOps";
    const location = (filters.location as string) ?? "France";

    console.log(
      `[linkedin-jobs] Stub harvest — keywords: "${keywords}", location: ${location}`
    );

    // Realistic mock results
    const mockResults: SignalResult[] = [
      {
        domain: "spendesk.com",
        data: {
          company_name: "Spendesk",
          job_title: "Head of Revenue Operations",
          job_department: "Operations",
          posted_date: "2024-11-28",
          location: "Paris, France",
          seniority: "Director",
        },
        source_meta: {
          linkedin_job_url:
            "https://linkedin.com/jobs/view/head-of-revenue-operations-spendesk-paris",
          serper_position: 1,
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "contentsquare.com",
        data: {
          company_name: "Contentsquare",
          job_title: "Senior Sales Operations Manager",
          job_department: "Sales",
          posted_date: "2024-11-25",
          location: "Paris, France",
          seniority: "Senior",
        },
        source_meta: {
          linkedin_job_url:
            "https://linkedin.com/jobs/view/senior-sales-ops-contentsquare-paris",
          serper_position: 2,
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "datadog.com",
        data: {
          company_name: "Datadog",
          job_title: "GTM Strategy & Operations Lead",
          job_department: "GTM",
          posted_date: "2024-11-22",
          location: "Paris, France",
          seniority: "Lead",
        },
        source_meta: {
          linkedin_job_url:
            "https://linkedin.com/jobs/view/gtm-strategy-ops-datadog-paris",
          serper_position: 3,
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "payfit.com",
        data: {
          company_name: "PayFit",
          job_title: "Marketing Operations Manager",
          job_department: "Marketing",
          posted_date: "2024-11-20",
          location: "Paris, France",
          seniority: "Manager",
        },
        source_meta: {
          linkedin_job_url:
            "https://linkedin.com/jobs/view/marketing-ops-payfit-paris",
          serper_position: 4,
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
      {
        domain: "algolia.com",
        data: {
          company_name: "Algolia",
          job_title: "Director of Sales Operations",
          job_department: "Sales",
          posted_date: "2024-11-18",
          location: "Paris, France",
          seniority: "Director",
        },
        source_meta: {
          linkedin_job_url:
            "https://linkedin.com/jobs/view/director-sales-ops-algolia-paris",
          serper_position: 5,
          fetched_at: new Date().toISOString(),
          filters_used: filters,
        },
      },
    ];

    return mockResults;
  },
};
