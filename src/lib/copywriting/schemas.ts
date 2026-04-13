import { z } from "zod";

export const sequenceStepSchema = z.object({
  step_number: z.number(),
  subject: z.string().optional().describe("Subject line (cold-email only)"),
  body: z.string().describe("Main message body"),
  cta: z.string().optional().describe("Call to action"),
  notes: z.string().optional().describe("Objection handling notes (cold-calling)"),
});

export const sequenceOutputSchema = z.object({
  channel: z.enum(["linkedin", "cold-email", "cold-calling"]),
  tone: z.enum(["professional", "conversational", "provocative", "educational"]),
  steps: z.array(sequenceStepSchema),
});

export const debateSummarySchema = z.object({
  recommended_angle: z.string().describe("The recommended messaging angle"),
  key_arguments: z.array(z.string()).describe("Key arguments from the debate"),
  tone_direction: z.string().describe("Recommended tone direction"),
  hooks: z.array(z.string()).describe("Best opening hooks identified"),
});

export const createSessionSchema = z.object({
  workspace_id: z.string().uuid(),
  channel: z.enum(["linkedin", "cold-email", "cold-calling"]),
  tone: z.enum(["professional", "conversational", "provocative", "educational"]),
  mode: z.enum(["quick", "deep"]),
  sequence_length: z.number().int().min(1).max(5),
  brief: z.string().min(1),
  title: z.string().optional(),
});

export const generateSchema = z.object({
  session_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
});
