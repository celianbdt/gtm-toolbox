import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { generateSchema } from "@/lib/copywriting/schemas";
import { sequenceOutputSchema, debateSummarySchema } from "@/lib/copywriting/schemas";
import {
  getCWSession,
  getWorkspaceContext,
  updateSessionPhase,
  insertSessionOutput,
} from "@/lib/copywriting/db";
import { buildGenerationPrompt, buildDebatePrompt, DEBATE_AGENTS } from "@/lib/copywriting/prompts";
import { getWorkspaceAPIKeys, createWorkspaceAnthropic } from "@/lib/ai/provider";
import { loadInsightsForTool } from "@/lib/insights/auto-load";
import { streamText, generateObject } from "ai";
import type { CWSSEEvent, CWSessionConfig } from "@/lib/copywriting/types";

function encodeSSE(event: CWSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation error" }), { status: 400 });
    }

    const { session_id, workspace_id } = parsed.data;
    const session = await getCWSession(session_id);
    const config = session.config as CWSessionConfig;
    const keys = await getWorkspaceAPIKeys(workspace_id);
    const anthropic = createWorkspaceAnthropic(keys);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: CWSSEEvent) => {
          controller.enqueue(encoder.encode(encodeSSE(event)));
        };

        try {
          // Phase 1: Load context + insights from prior sessions
          send({ type: "phase_start", phase: "context-loading" });
          const [context, insights] = await Promise.all([
            getWorkspaceContext(workspace_id),
            loadInsightsForTool(workspace_id, "copywriting"),
          ]);
          await updateSessionPhase(session_id, "context-loading");
          send({ type: "phase_done", phase: "context-loading" });

          let debateSummaryText: string | undefined;

          // Phase 2 (Deep mode only): Agent debate
          if (config.mode === "deep") {
            send({ type: "phase_start", phase: "debate" });
            await updateSessionPhase(session_id, "debate");

            const debatePrompt = buildDebatePrompt(config, context, insights);

            // Stream each agent's take
            for (const agent of DEBATE_AGENTS) {
              send({
                type: "agent_start",
                agentId: agent.id,
                agentName: agent.name,
                emoji: agent.emoji,
                color: agent.color,
              });

              const agentStream = streamText({
                model: anthropic("claude-haiku-4-5-20251001"),
                system: agent.system_prompt,
                prompt: debatePrompt,
                maxOutputTokens: 800,
              });

              for await (const chunk of agentStream.textStream) {
                send({ type: "agent_delta", agentId: agent.id, delta: chunk });
              }

              const fullText = await agentStream.text;
              send({ type: "agent_done", agentId: agent.id, fullContent: fullText });
            }

            // Synthesize debate into actionable recommendations
            const { object: summary } = await generateObject({
              model: anthropic("claude-haiku-4-5-20251001"),
              schema: debateSummarySchema,
              prompt: `Resume ce debat entre agents copywriting en recommandations actionables:\n\n${DEBATE_AGENTS.map((a) => `${a.name}: (voir messages ci-dessus)`).join("\n")}\n\nExtrait l'angle recommande, les arguments cles, la direction de ton, et les meilleurs hooks.`,
            });

            debateSummaryText = `Angle: ${summary.recommended_angle}\nArguments: ${summary.key_arguments.join(", ")}\nTon: ${summary.tone_direction}\nHooks: ${summary.hooks.join(" | ")}`;

            const debateOutput = await insertSessionOutput({
              session_id,
              output_type: "debate-summary",
              title: "Synthese du debat",
              description: debateSummaryText,
              metadata: summary,
            });

            send({ type: "output_ready", outputType: "debate-summary", outputId: debateOutput.id });
            send({ type: "phase_done", phase: "debate" });
          }

          // Phase 3: Generate sequence
          send({ type: "phase_start", phase: "generation" });
          await updateSessionPhase(session_id, "generation");

          const generationPrompt = buildGenerationPrompt(config, context, debateSummaryText, insights);

          const { object: sequence } = await generateObject({
            model: anthropic("claude-sonnet-4-5-20250514"),
            schema: sequenceOutputSchema,
            prompt: generationPrompt,
          });

          const seqOutput = await insertSessionOutput({
            session_id,
            output_type: "sequence",
            title: `Sequence ${config.channel} — ${config.sequence_length} steps`,
            description: `Sequence generee en mode ${config.mode}`,
            metadata: sequence,
          });

          send({ type: "output_ready", outputType: "sequence", outputId: seqOutput.id });
          send({ type: "phase_done", phase: "generation" });

          // Complete
          await updateSessionPhase(session_id, "complete");
          send({ type: "generation_complete" });
        } catch (error) {
          console.error("Generation error:", error);
          send({ type: "error", message: String(error) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Copywriting generate error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate" }), { status: 500 });
  }
}
