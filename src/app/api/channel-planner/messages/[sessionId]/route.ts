import { NextRequest, NextResponse } from "next/server";
import { getSessionMessages, getAgentsByIds, getCPSession } from "@/lib/channel-planner/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getCPSession(sessionId);
    const agents = await getAgentsByIds(session.config.analyst_agent_ids);
    const messages = await getSessionMessages(sessionId);

    const agentsMap = new Map(agents.map((a) => [a.id, a]));
    const enriched = messages.map((m) => {
      const agent = m.agent_config_id ? agentsMap.get(m.agent_config_id) : null;
      return {
        ...m,
        agent_name: agent?.name ?? (m.role === "user" ? "You" : "System"),
        agent_emoji: agent?.avatar_emoji ?? "",
        agent_color: agent?.color ?? "#7C3AED",
      };
    });

    return NextResponse.json({ messages: enriched, session });
  } catch (error) {
    console.error("Failed to fetch CP messages:", error);
    return NextResponse.json({ messages: [], session: null }, { status: 500 });
  }
}
