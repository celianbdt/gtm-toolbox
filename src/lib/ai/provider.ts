import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModelForUseCase, type UseCase } from "./models";

export type WorkspaceAPIKeys = {
  anthropic_api_key?: string;
  openai_api_key?: string;
};

/**
 * Load API keys for a workspace from the database.
 * Falls back to environment variables if no workspace keys are set.
 */
export async function getWorkspaceAPIKeys(workspaceId: string): Promise<WorkspaceAPIKeys> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("workspaces")
    .select("api_keys")
    .eq("id", workspaceId)
    .single();

  return (data?.api_keys as WorkspaceAPIKeys) ?? {};
}

/**
 * Create an Anthropic provider using workspace-specific API key,
 * falling back to the global environment variable.
 */
export function createWorkspaceAnthropic(keys: WorkspaceAPIKeys) {
  const apiKey = keys.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("No Anthropic API key configured. Add one in workspace settings.");
  }
  return createAnthropic({ apiKey });
}

/**
 * Create an OpenAI provider using workspace-specific API key,
 * falling back to the global environment variable.
 */
export function createWorkspaceOpenAI(keys: WorkspaceAPIKeys) {
  const apiKey = keys.openai_api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No OpenAI API key configured. Add one in workspace settings.");
  }
  return createOpenAI({ apiKey });
}

/**
 * Convenience: load keys + create Anthropic provider in one call.
 */
export async function getAnthropicForWorkspace(workspaceId: string) {
  const keys = await getWorkspaceAPIKeys(workspaceId);
  return createWorkspaceAnthropic(keys);
}

/**
 * Resolve a model ID to a LanguageModel instance using workspace keys.
 * Supports both Anthropic and OpenAI model IDs.
 */
export function resolveModel(modelId: string, keys: WorkspaceAPIKeys): LanguageModel {
  // OpenAI models
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1") || modelId.startsWith("o3")) {
    const openai = createWorkspaceOpenAI(keys);
    return openai(modelId) as LanguageModel;
  }
  // Anthropic models (claude-*)
  const anthropic = createWorkspaceAnthropic(keys);
  return anthropic(modelId) as LanguageModel;
}

/**
 * Resolve a model for a specific use-case using the centralized strategy.
 * Uses GPT-4o-mini for cheap tasks, Sonnet for quality-critical tasks.
 */
export function resolveModelForUseCase(useCase: UseCase, keys: WorkspaceAPIKeys): LanguageModel {
  const modelId = getModelForUseCase(useCase);
  return resolveModel(modelId, keys);
}

/**
 * Get a model for a specific agent index, cycling through the selected models.
 * If models = ["claude-sonnet-4-5", "gpt-4o"], agent 0 gets Claude, agent 1 gets GPT, etc.
 */
export function getModelForAgent(models: string[], agentIndex: number, keys: WorkspaceAPIKeys): LanguageModel {
  const modelId = models[agentIndex % models.length];
  return resolveModel(modelId, keys);
}
