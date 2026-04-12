import { serve } from "inngest/next";
import { inngest } from "@/lib/ops-engine/inngest/client";
import {
  signalHarvestJob,
  enrichmentJob,
  scoringJob,
  automationJob,
  weeklyDigestJob,
  cleanupJob,
} from "@/lib/ops-engine/inngest/functions";
import {
  integrationSyncJob,
  dailyIntegrationSyncJob,
} from "@/lib/integrations/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    signalHarvestJob,
    enrichmentJob,
    scoringJob,
    automationJob,
    weeklyDigestJob,
    cleanupJob,
    integrationSyncJob,
    dailyIntegrationSyncJob,
  ],
});
