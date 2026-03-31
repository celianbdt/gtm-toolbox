import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getTemplate, instantiateTemplate } from "@/lib/ops-engine/db";
import { z } from "zod";

const instantiateSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(200),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { templateId } = await params;
    const template = await getTemplate(templateId);
    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to get template:", error);
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { templateId } = await params;
    const body = await request.json();
    const parsed = instantiateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const table = await instantiateTemplate(
      templateId,
      parsed.data.workspace_id,
      parsed.data.name
    );
    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error("Failed to instantiate template:", error);
    return NextResponse.json(
      { error: "Failed to instantiate template" },
      { status: 500 }
    );
  }
}
