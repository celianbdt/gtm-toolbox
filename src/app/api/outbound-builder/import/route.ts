import { NextRequest, NextResponse } from "next/server";
import { importFromProvider } from "@/lib/outbound-builder/connectors";
import { requireAuth } from "@/lib/supabase/auth";
import type { OutboundProvider } from "@/lib/outbound-builder/connectors";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { provider, apiKey, workspaceId } = body as {
      provider: OutboundProvider;
      apiKey: string;
      workspaceId?: string;
    };

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "provider and apiKey required" }, { status: 400 });
    }

    const result = await importFromProvider({ provider, apiKey, workspaceId });

    return NextResponse.json({
      rows: result.rows,
      campaignCount: result.campaignCount,
      provider: result.provider,
    });
  } catch (e) {
    console.error("[outbound-builder/import]", e);
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
