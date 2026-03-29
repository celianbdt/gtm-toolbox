import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getSession, getSessionMessages, getAgentsByIds } from "@/lib/debate/db";
import { DebateSummarySchema } from "@/lib/debate/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/supabase/auth";
import type { AgentConfig } from "@/lib/debate/types";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { sessionId } = (await request.json()) as { sessionId: string };

  try {
    const session = await getSession(sessionId);
    const messages = await getSessionMessages(sessionId);
    const agents = await getAgentsByIds(session.config.agent_ids);
    const agentsMap = new Map<string, AgentConfig>(agents.map((a) => [a.id, a]));

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages to synthesize" }, { status: 400 });
    }

    // Build transcript
    const transcript = messages
      .map((m) => {
        if (m.role === "user") return `[Human]: ${m.content}`;
        const agent = m.agent_config_id ? agentsMap.get(m.agent_config_id) : null;
        const name = agent ? `${agent.name} (${agent.role})` : "Agent";
        return `[${name}]: ${m.content}`;
      })
      .join("\n\n");

    const { object: summary } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: DebateSummarySchema,
      prompt: `You are a strategic synthesis expert. Analyze the following multi-agent debate transcript and produce a structured summary.

## Debate Mission
${session.config.mission}

## Transcript
${transcript}

Extract the key decisions made, main takeaways, unresolved tensions, and strategic recommendations.
Be concise and actionable. Focus on what matters for decision-making.`,
    });

    // Store as session_output
    const supabase = createAdminClient();
    const description = summary.key_takeaways.slice(0, 3).join("; ");

    const { data: output, error: insertErr } = await supabase
      .from("session_outputs")
      .insert({
        session_id: sessionId,
        output_type: "debate-summary",
        title: `Debate Summary: ${session.title}`,
        description,
        confidence_score: null,
        tags: ["debate", "synthesis"],
        metadata: summary,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Mark session as concluded
    const { error: updateErr } = await supabase
      .from("tool_sessions")
      .update({ status: "concluded" })
      .eq("id", sessionId);
    if (updateErr) throw updateErr;

    return NextResponse.json({ output });
  } catch (e) {
    console.error("[debate/synthesize]", e);
    return NextResponse.json(
      { error: "Failed to synthesize debate" },
      { status: 500 }
    );
  }
}
