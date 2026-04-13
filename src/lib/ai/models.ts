export type ModelProvider = "anthropic" | "openai";

export type ModelConfig = {
  id: string;
  provider: ModelProvider;
  displayName: string;
  inputPricePer1MTokens: number;
  outputPricePer1MTokens: number;
};

export type UseCase =
  | "extraction"
  | "debate"
  | "synthesis"
  | "assessment"
  | "generation"
  | "scoring"
  | "report"
  | "agent";

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    displayName: "GPT-4o Mini",
    inputPricePer1MTokens: 0.15,
    outputPricePer1MTokens: 0.60,
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    displayName: "Claude Haiku 4.5",
    inputPricePer1MTokens: 1.0,
    outputPricePer1MTokens: 5.0,
  },
  "claude-sonnet-4-5-20250514": {
    id: "claude-sonnet-4-5-20250514",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.5",
    inputPricePer1MTokens: 3.0,
    outputPricePer1MTokens: 15.0,
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5-20250514",
    provider: "anthropic",
    displayName: "Claude Sonnet 4.5",
    inputPricePer1MTokens: 3.0,
    outputPricePer1MTokens: 15.0,
  },
};

// GPT-4o-mini for cheap tasks, Sonnet for quality-critical tasks
export const MODEL_STRATEGY: Record<UseCase, string> = {
  extraction: "gpt-4o-mini",
  debate: "gpt-4o-mini",
  scoring: "gpt-4o-mini",
  report: "gpt-4o-mini",
  synthesis: "claude-sonnet-4-5-20250514",
  assessment: "claude-sonnet-4-5-20250514",
  generation: "claude-sonnet-4-5-20250514",
  agent: "claude-sonnet-4-5-20250514",
};

export function getModelForUseCase(useCase: UseCase): string {
  return MODEL_STRATEGY[useCase];
}

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_REGISTRY[modelId];
}
