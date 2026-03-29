import { NextRequest, NextResponse } from "next/server";
import { createMLSession, getMLAgentTemplates } from "@/lib/messaging-lab/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";
import type {
  MLSessionConfig,
  ProductInfo,
  AudienceInfo,
  CompetitorMessaging,
  CurrentMessaging,
  MessagingFocus,
} from "@/lib/messaging-lab/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      product,
      audience,
      competitors,
      currentMessaging,
      focusDimensions,
      customQuestion,
      insightSessionIds,
    } = body as {
      workspaceId: string;
      product: ProductInfo;
      audience: AudienceInfo;
      competitors: CompetitorMessaging[];
      currentMessaging: CurrentMessaging;
      focusDimensions: MessagingFocus[];
      customQuestion?: string;
      insightSessionIds?: string[];
    };

    if (!workspaceId || !product?.name || !audience?.icp_summary || !focusDimensions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    const agents = await getMLAgentTemplates();
    if (agents.length === 0) {
      return NextResponse.json(
        { error: "Messaging Lab agent templates not found. Run the migration." },
        { status: 500 }
      );
    }

    const config: MLSessionConfig = {
      product,
      audience,
      competitors: competitors ?? [],
      current_messaging: currentMessaging ?? { value_props: [] },
      focus_dimensions: focusDimensions,
      custom_question: customQuestion,
      analyst_agent_ids: agents.map((a) => a.id),
      current_phase: "context-loading",
      phase_config: {
        debate_rounds: 1,
      },
      insight_session_ids: insightSessionIds,
    };

    const title = `Messaging Lab: ${product.name}`;

    const session = await createMLSession({
      workspace_id: workspaceId,
      config,
      title: title.slice(0, 80),
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to create ML session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
