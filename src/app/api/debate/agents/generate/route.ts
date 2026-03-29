import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { insertAgentConfigs } from "@/lib/debate/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";

const AgentSchema = z.object({
  name: z.string(),
  slug: z.string(),
  avatar_emoji: z.string(),
  color: z.string(),
  role: z.string(),
  personality: z.object({
    traits: z.object({
      assertiveness: z.number(),
      creativity: z.number(),
      empathy: z.number(),
      risk_tolerance: z.number(),
      contrarian_tendency: z.number(),
      data_orientation: z.number(),
    }),
    speaking_style: z.string(),
    biases: z.array(z.string()),
    trigger_topics: z.array(z.string()),
  }),
  system_prompt: z.string(),
  engagement_weights: z.object({
    contradiction: z.number(),
    new_data: z.number(),
    customer_mention: z.number(),
    strategy_shift: z.number(),
  }),
});

const ResponseSchema = z.object({
  agents: z.array(AgentSchema),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, workspaceId } = body as { prompt: string; workspaceId: string };

    if (!prompt || !workspaceId) {
      return NextResponse.json({ error: "Missing prompt or workspaceId" }, { status: 400 });
    }

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: ResponseSchema,
      system: `You are a debate team composition AI for GTM (Go-To-Market) strategy discussions.
Given a description of desired debate participants, generate 2–4 agent configurations.
Each agent must have:
- A distinct GTM perspective (strategy, sales, marketing, product, finance, customer success, etc.)
- Specific trigger_topics relevant to B2B GTM (e.g. "ICP", "pricing", "CAC", "churn", "positioning")
- engagement_weights between 0 and 1 reflecting their personality (contradiction = how much they push back, new_data = data-driven, customer_mention = customer-focused, strategy_shift = big picture)
- A detailed system_prompt in first person, describing their background, approach, and debate style
- A unique avatar_emoji
- A hex color code for their card
- traits as a record of trait names to float values 0-1 (assertiveness, creativity, empathy, risk_tolerance, contrarian_tendency, data_orientation)
- slug must be kebab-case, unique among the generated agents
Make agents have meaningfully different perspectives so debates are interesting and productive.`,
      prompt: `Create a debate team based on this description: "${prompt}"`,
    });

    const suffix = Math.random().toString(36).slice(2, 6);
    const agentsToInsert = object.agents.map((agent) => ({
      ...agent,
      slug: `${agent.slug}-${suffix}`,
      workspace_id: workspaceId,
      is_template: false,
    }));

    const inserted = await insertAgentConfigs(agentsToInsert);
    return NextResponse.json({ agents: inserted });
  } catch (error) {
    console.error("Failed to generate agents:", error);
    return NextResponse.json({ error: "Failed to generate agents" }, { status: 500 });
  }
}
