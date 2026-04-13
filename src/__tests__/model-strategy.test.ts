import { describe, it, expect } from "vitest";
import {
  getModelForUseCase,
  getModelConfig,
  MODEL_STRATEGY,
  MODEL_REGISTRY,
} from "@/lib/ai/models";

describe("Model strategy", () => {
  it("getModelForUseCase('extraction') returns 'gpt-4o-mini'", () => {
    expect(getModelForUseCase("extraction")).toBe("gpt-4o-mini");
  });

  it("getModelForUseCase('synthesis') returns a sonnet model", () => {
    const model = getModelForUseCase("synthesis");
    expect(model).toMatch(/sonnet/i);
  });

  it("all use cases have a valid model assigned", () => {
    const useCases = Object.keys(MODEL_STRATEGY) as Array<
      keyof typeof MODEL_STRATEGY
    >;
    expect(useCases.length).toBeGreaterThan(0);
    for (const uc of useCases) {
      const modelId = MODEL_STRATEGY[uc];
      expect(typeof modelId).toBe("string");
      expect(modelId.length).toBeGreaterThan(0);
      // Model must exist in registry
      expect(MODEL_REGISTRY[modelId]).toBeDefined();
    }
  });

  it("all model configs have positive pricing", () => {
    const models = Object.values(MODEL_REGISTRY);
    expect(models.length).toBeGreaterThan(0);
    for (const config of models) {
      expect(config.inputPricePer1MTokens).toBeGreaterThan(0);
      expect(config.outputPricePer1MTokens).toBeGreaterThan(0);
    }
  });

  it("getModelConfig('gpt-4o-mini') returns correct pricing", () => {
    const config = getModelConfig("gpt-4o-mini");
    expect(config).toBeDefined();
    expect(config!.id).toBe("gpt-4o-mini");
    expect(config!.provider).toBe("openai");
    expect(config!.inputPricePer1MTokens).toBe(0.15);
    expect(config!.outputPricePer1MTokens).toBe(0.6);
  });

  it("getModelConfig('nonexistent') returns undefined", () => {
    expect(getModelConfig("nonexistent")).toBeUndefined();
  });
});
