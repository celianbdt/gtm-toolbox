import type { ProviderCredentials, ImportResult } from "./types";
import { fetchLemlistCampaigns } from "./lemlist";
import { fetchInstantlyCampaigns } from "./instantly";
import { fetchPlusVibeCampaigns } from "./plusvibe";
import { fetchSmartleadCampaigns } from "./smartlead";

export async function importFromProvider(credentials: ProviderCredentials): Promise<ImportResult> {
  const { provider, apiKey, workspaceId } = credentials;

  let rows;
  switch (provider) {
    case "lemlist":
      rows = await fetchLemlistCampaigns(apiKey);
      break;
    case "instantly":
      rows = await fetchInstantlyCampaigns(apiKey);
      break;
    case "plusvibe":
      if (!workspaceId) throw new Error("PlusVibe requires a workspace ID");
      rows = await fetchPlusVibeCampaigns(apiKey, workspaceId);
      break;
    case "smartlead":
      rows = await fetchSmartleadCampaigns(apiKey);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return {
    rows,
    campaignCount: rows.length,
    provider,
  };
}

export { PROVIDER_LABELS, PROVIDER_COLORS } from "./types";
export type { OutboundProvider, ProviderCredentials, ImportResult } from "./types";
