import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { buildClientReportPrompt } from "@/lib/dashboard/client-report-prompt";
import { getWorkspaceAPIKeys, createWorkspaceAnthropic } from "@/lib/ai/provider";
import { streamText } from "ai";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { workspace_ids, vocal_notes } = body as {
      workspace_ids: string[];
      vocal_notes?: string;
    };

    if (!workspace_ids || workspace_ids.length === 0) {
      return new Response(JSON.stringify({ error: "workspace_ids required" }), { status: 400 });
    }

    // Use first workspace's API keys for the AI call
    const keys = await getWorkspaceAPIKeys(workspace_ids[0]);
    const anthropic = createWorkspaceAnthropic(keys);

    const prompt = await buildClientReportPrompt(workspace_ids, vocal_notes ?? "");

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Failed to generate client report:", error);
    return new Response(JSON.stringify({ error: "Failed to generate report" }), { status: 500 });
  }
}
