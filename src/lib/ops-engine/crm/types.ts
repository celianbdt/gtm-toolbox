export type CrmProvider = "hubspot" | "attio" | "pipedrive" | "folk";

export type CrmConnectionConfig = {
  provider: CrmProvider;
  access_token?: string;
  api_key?: string;
  refresh_token?: string;
  portal_id?: string;
};

export type CrmRecord = {
  domain: string | null;
  company_name: string | null;
  data: Record<string, unknown>;
};

export type CrmImportResult = {
  provider: CrmProvider;
  records: CrmRecord[];
  total_fetched: number;
  errors: string[];
};

export interface CrmConnector {
  provider: CrmProvider;
  testConnection(config: CrmConnectionConfig): Promise<boolean>;
  importContacts(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult>;
  importCompanies(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult>;
}
