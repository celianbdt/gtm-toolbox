import { NextRequest, NextResponse } from "next/server";
import { getCompetitorDocs } from "@/lib/competitive-intel/db";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ docs: [] });
  }

  try {
    const docs = await getCompetitorDocs(workspaceId);
    return NextResponse.json({ docs });
  } catch {
    return NextResponse.json({ docs: [] });
  }
}
