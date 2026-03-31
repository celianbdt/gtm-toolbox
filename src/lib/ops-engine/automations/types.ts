import type { OpsAutomation, OpsRow, ThresholdTier } from "../types";

export type AutomationContext = {
  row: OpsRow;
  table_name: string;
  workspace_id: string;
  previous_tier: ThresholdTier;
  new_tier: ThresholdTier;
};

export type AutomationResult = {
  success: boolean;
  automation_id: string;
  automation_type: string;
  message: string;
  response_data?: Record<string, unknown>;
};

export interface AutomationRunner {
  type: string;
  execute(
    automation: OpsAutomation,
    context: AutomationContext,
  ): Promise<AutomationResult>;
}
