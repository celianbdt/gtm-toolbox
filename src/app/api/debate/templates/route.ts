import { NextResponse } from "next/server";
import { getAgentTemplates } from "@/lib/debate/db";

export async function GET() {
  try {
    const templates = await getAgentTemplates();
    return NextResponse.json({ agents: templates });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
