import { getModelForUseCase, getModelConfig, type UseCase } from "./models";

export type CostBreakdown = {
  phase: string;
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  cost: number;
};

export type CostEstimate = {
  totalEstimatedCost: number;
  breakdown: CostBreakdown[];
};

const PHASE_TOKENS: Record<string, { input: number; output: number }> = {
  extraction: { input: 2000, output: 500 },
  debate_per_agent: { input: 1500, output: 800 },
  synthesis: { input: 4000, output: 2000 },
  assessment_per_agent: { input: 3000, output: 1500 },
  generation: { input: 3000, output: 2000 },
  report: { input: 3000, output: 1500 },
};

function estimatePhase(phase: string, useCase: UseCase, multiplier = 1): CostBreakdown {
  const modelId = getModelForUseCase(useCase);
  const config = getModelConfig(modelId);
  const tokens = PHASE_TOKENS[phase] ?? PHASE_TOKENS.extraction;
  const inputCost = (tokens.input * multiplier * (config?.inputPricePer1MTokens ?? 1)) / 1_000_000;
  const outputCost = (tokens.output * multiplier * (config?.outputPricePer1MTokens ?? 5)) / 1_000_000;
  return {
    phase,
    model: config?.displayName ?? modelId,
    estimatedInputTokens: tokens.input * multiplier,
    estimatedOutputTokens: tokens.output * multiplier,
    cost: Math.round((inputCost + outputCost) * 10000) / 10000,
  };
}

const TOOL_PHASES: Record<string, () => CostBreakdown[]> = {
  copywriting: () => [
    estimatePhase("extraction", "extraction"),
    estimatePhase("debate_per_agent", "debate", 3),
    estimatePhase("generation", "generation"),
  ],
  "icp-audit": () => [
    estimatePhase("extraction", "extraction"),
    estimatePhase("assessment_per_agent", "assessment", 3),
    estimatePhase("synthesis", "synthesis", 6),
  ],
  "messaging-lab": () => [
    estimatePhase("extraction", "extraction"),
    estimatePhase("assessment_per_agent", "assessment", 4),
    estimatePhase("synthesis", "synthesis", 6),
  ],
  "competitive-intel": () => [
    estimatePhase("extraction", "extraction"),
    estimatePhase("assessment_per_agent", "assessment", 3),
    estimatePhase("synthesis", "synthesis", 6),
  ],
  "channel-planner": () => [
    estimatePhase("extraction", "extraction"),
    estimatePhase("assessment_per_agent", "assessment", 2),
    estimatePhase("synthesis", "synthesis", 6),
  ],
  "outbound-builder": () => [
    estimatePhase("extraction", "extraction"),
    estimatePhase("assessment_per_agent", "assessment", 3),
    estimatePhase("synthesis", "synthesis", 4),
  ],
  "strategy-debate": () => [
    estimatePhase("debate_per_agent", "assessment", 3),
    estimatePhase("synthesis", "synthesis"),
  ],
};

export function estimateToolCost(toolId: string): CostEstimate {
  const phaseFn = TOOL_PHASES[toolId];
  if (!phaseFn) return { totalEstimatedCost: 0, breakdown: [] };
  const breakdown = phaseFn();
  const totalEstimatedCost = Math.round(breakdown.reduce((sum, b) => sum + b.cost, 0) * 10000) / 10000;
  return { totalEstimatedCost, breakdown };
}
