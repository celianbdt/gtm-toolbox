import type { EnricherProvider } from "../types";

export type EnrichmentField =
  | "email"
  | "phone"
  | "linkedin_url"
  | "title"
  | "seniority"
  | "company_name"
  | "company_description"
  | "industry"
  | "employee_count"
  | "revenue_range"
  | "tech_stack"
  | "logo_url"
  | "website_description"
  | "social_profiles"
  | "location"
  | "founded_year"
  | "funding_total"
  | "first_name"
  | "last_name";

export type EnrichmentRequest = {
  domain: string;
  name?: string;
  email?: string;
  linkedin_url?: string;
  fields: EnrichmentField[];
};

export type EnrichmentResult = {
  provider: EnricherProvider;
  success: boolean;
  data: Partial<Record<EnrichmentField, string | number | string[]>>;
  confidence: Partial<Record<EnrichmentField, number>>;
  raw_response: Record<string, unknown>;
  credits_used: number;
};

export interface EnricherConnector {
  provider: EnricherProvider;
  supportedFields: EnrichmentField[];
  estimatedCostPerCall: number;
  enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult>;
}
