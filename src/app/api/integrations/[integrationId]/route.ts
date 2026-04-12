import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ integrationId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { integrationId } = await params;
  const body = await request.json();
  const { config } = body as { config: Record<string, unknown> };

  if (!config) {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("integrations")
    .update({ config })
    .eq("id", integrationId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to update integration:", error);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }

  return NextResponse.json({ integration: data });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { integrationId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("integrations")
    .update({ status: "disconnected", credentials: {}, error_message: null })
    .eq("id", integrationId)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to disconnect integration:", error);
    return NextResponse.json({ error: "Failed to disconnect integration" }, { status: 500 });
  }

  return NextResponse.json({ integration: data });
}
