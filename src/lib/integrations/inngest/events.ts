export type IntegrationEvents = {
  "integration/sync.requested": {
    data: {
      integration_id: string;
      workspace_id: string;
      provider: string;
    };
  };
};
