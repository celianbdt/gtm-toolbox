import { z } from "zod";

export const DebateSummarySchema = z.object({
  key_decisions: z.array(
    z.object({
      topic: z.string(),
      decision: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
    })
  ),
  key_takeaways: z.array(z.string()),
  unresolved_tensions: z.array(z.string()),
  strategic_recommendations: z.array(z.string()),
});

export type DebateSummary = z.infer<typeof DebateSummarySchema>;
