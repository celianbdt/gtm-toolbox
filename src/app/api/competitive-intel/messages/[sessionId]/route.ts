import { NextRequest, NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/competitive-intel/db";
import { getAgentsByIds } from "@/lib/competitive-intel/db";
import { getCISession } from "@/lib/competitive-intel/db";
import { requireAuth } from "@/lib/supabase/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { sessionId } = await params;
    const session = await getCISession(sessionId);
    const agents = await getAgentsByIds(session.config.analyst_agent_ids);
    const messages = await getSessionMessages(sessionId);

    // Enrich messages with agent info
    const agentsMap = new Map(agents.map((a) => [a.id, a]));
    const enriched = messages.map((m) => {
      const agent = m.agent_config_id ? agentsMap.get(m.agent_config_id) : null;
      return {
        ...m,
        agent_name: agent?.name ?? (m.role === "user" ? "You" : "System"),
        agent_emoji: agent?.avatar_emoji ?? "",
        agent_color: agent?.color ?? "#8a6e4e",
      };
    });

    return NextResponse.json({ messages: enriched, session });
  } catch (error) {
    console.error("Failed to fetch CI messages:", error);
    return NextResponse.json({ messages: [], session: null }, { status: 500 });
  }
}
