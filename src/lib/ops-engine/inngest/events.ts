export type OpsEvents = {
  "ops/enrichment.requested": {
    data: { row_id: string; table_id: string; workspace_id: string };
  };
  "ops/scoring.requested": {
    data: { row_id: string; table_id: string };
  };
  "ops/automation.triggered": {
    data: {
      row_id: string;
      table_id: string;
      new_tier: string;
      previous_tier: string;
    };
  };
  "ops/signal.harvested": {
    data: {
      table_id: string;
      workspace_id: string;
      source: string;
      rows_created: number;
    };
  };
};
