import { NextResponse } from "next/server";
import { getAgentTemplates } from "@/lib/debate/db";
import { requireAuth } from "@/lib/supabase/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const templates = await getAgentTemplates();
    return NextResponse.json({ agents: templates });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
