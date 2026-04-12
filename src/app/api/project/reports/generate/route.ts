import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireAuth } from "@/lib/supabase/auth";
import { gatherReportData, buildReportPrompt } from "@/lib/project/report-prompt";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { workspace_id, week_start } = body as {
      workspace_id: string;
      week_start: string;
    };

    if (!workspace_id || !week_start) {
      return NextResponse.json(
        { error: "workspace_id and week_start are required" },
        { status: 400 }
      );
    }

    const ctx = await gatherReportData(workspace_id, week_start);
    const prompt = buildReportPrompt(ctx);

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      prompt,
      maxOutputTokens: 1500,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
