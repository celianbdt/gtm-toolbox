import type { WaterfallStep } from "../types";
import type {
  EnrichmentRequest,
  EnrichmentField,
} from "./types";
import { getConnector } from "./connectors";
import { lookupCacheMulti, storeCacheMulti } from "./cache";
import { trackApiCall } from "../cost";

// ── Result types ──

type ResolvedField = {
  value: string | number | string[];
  source: string;
  confidence: number;
};

type StepResult = {
  provider: string;
  success: boolean;
  fields_resolved: string[];
  credits_used: number;
};

export type WaterfallResult = {
  resolved: Partial<Record<EnrichmentField, ResolvedField>>;
  unresolved: EnrichmentField[];
  steps_executed: StepResult[];
  total_credits: number;
};

// ── Main waterfall runner ──

export async function runWaterfall(
  waterfallSteps: WaterfallStep[],
  request: EnrichmentRequest,
  apiKeys: Record<string, string>,
  workspaceId: string,
  options?: { skipCache?: boolean }
): Promise<WaterfallResult> {
  const resolved: Partial<Record<EnrichmentField, ResolvedField>> = {};
  const unresolved = new Set<EnrichmentField>(request.fields);
  const stepsExecuted: StepResult[] = [];
  let totalCredits = 0;

  // ── Step 0: Check cache for all fields across all providers ──
  if (!options?.skipCache) {
    for (const step of waterfallSteps) {
      const connector = getConnector(step.provider);
      const fieldsToCheck = request.fields.filter(
        (f) => connector.supportedFields.includes(f) && unresolved.has(f)
      );

      if (fieldsToCheck.length === 0) continue;

      const cached = await lookupCacheMulti(
        workspaceId,
        request.domain,
        step.provider,
        fieldsToCheck
      );

      for (const [fieldKey, entry] of cached) {
        const field = fieldKey as EnrichmentField;
        if (entry.value !== null) {
          resolved[field] = {
            value: entry.value,
            source: `${step.provider} (cache)`,
            confidence: entry.confidence ?? 0.5,
          };
          unresolved.delete(field);
        }
      }
    }

    // If everything resolved from cache, return early
    if (unresolved.size === 0) {
      return {
        resolved,
        unresolved: [],
        steps_executed: [],
        total_credits: 0,
      };
    }
  }

  // ── Step 1-N: Run each waterfall step ──
  for (const step of waterfallSteps) {
    if (unresolved.size === 0) break;

    const connector = getConnector(step.provider);

    // Filter to fields this provider supports AND are still unresolved
    const fieldsForStep = Array.from(unresolved).filter((f) =>
      connector.supportedFields.includes(f)
    ) as EnrichmentField[];

    if (fieldsForStep.length === 0) {
      continue;
    }

    // Check API key
    const apiKey = apiKeys[step.provider];
    if (!apiKey) {
      console.warn(
        `[waterfall] Skipping ${step.provider}: no API key provided`
      );
      stepsExecuted.push({
        provider: step.provider,
        success: false,
        fields_resolved: [],
        credits_used: 0,
      });
      continue;
    }

    // Call connector
    try {
      const enrichRequest: EnrichmentRequest = {
        ...request,
        fields: fieldsForStep,
      };

      const result = await connector.enrich(enrichRequest, apiKey);

      // Track cost
      await trackApiCall(
        workspaceId,
        step.provider,
        connector.estimatedCostPerCall
      );
      totalCredits += result.credits_used;

      const fieldsResolved: string[] = [];

      // Process results
      for (const field of fieldsForStep) {
        const value = result.data[field];
        if (value !== undefined && value !== null) {
          resolved[field] = {
            value,
            source: step.provider,
            confidence: result.confidence[field] ?? 0.5,
          };
          unresolved.delete(field);
          fieldsResolved.push(field);
        }
      }

      // Store results in cache
      if (fieldsResolved.length > 0) {
        const cacheEntries = fieldsResolved.map((f) => {
          const field = f as EnrichmentField;
          const val = result.data[field];
          return {
            fieldKey: f,
            value: typeof val === "object" ? JSON.stringify(val) : String(val),
            rawResponse: result.raw_response,
            confidence: result.confidence[field],
          };
        });

        await storeCacheMulti(
          workspaceId,
          request.domain,
          step.provider,
          cacheEntries
        );
      }

      stepsExecuted.push({
        provider: step.provider,
        success: result.success,
        fields_resolved: fieldsResolved,
        credits_used: result.credits_used,
      });
    } catch (error) {
      console.error(
        `[waterfall] Error calling ${step.provider}:`,
        error
      );
      stepsExecuted.push({
        provider: step.provider,
        success: false,
        fields_resolved: [],
        credits_used: 0,
      });
    }
  }

  return {
    resolved,
    unresolved: Array.from(unresolved),
    steps_executed: stepsExecuted,
    total_credits: totalCredits,
  };
}
