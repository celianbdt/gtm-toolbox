import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/supabase/auth";

async function isSuperAdmin(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("app_role")
    .eq("id", userId)
    .single();
  return data?.app_role === "superadmin";
}

// GET — List whitelist entries (superadmin only)
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!(await isSuperAdmin(auth.user!.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending, approved, rejected, or null for all

  let query = supabase
    .from("signup_whitelist")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data });
}

// PATCH — Approve or reject a whitelist entry (superadmin only)
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!(await isSuperAdmin(auth.user!.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, action } = await request.json();

  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "id and action (approve|reject) required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const newStatus = action === "approve" ? "approved" : "rejected";
  const update: Record<string, unknown> = { status: newStatus };
  if (action === "approve") update.approved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("signup_whitelist")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

// POST — Manually add email to whitelist (superadmin only)
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!(await isSuperAdmin(auth.user!.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("signup_whitelist")
    .insert({
      email: email.toLowerCase().trim(),
      status: "approved",
      invited_by: auth.user!.id,
      approved_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}
