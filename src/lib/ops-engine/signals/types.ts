export type SignalResult = {
  domain: string;
  data: Record<string, unknown>;
  source_meta: Record<string, unknown>;
};

export interface SignalSourceHandler {
  source: string;
  harvest(
    filters: Record<string, unknown>,
    apiKey?: string
  ): Promise<SignalResult[]>;
}
