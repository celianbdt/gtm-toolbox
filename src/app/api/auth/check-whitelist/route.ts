import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// In-memory rate limiter (per IP)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 min

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const now = Date.now();
  const record = attempts.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }
    record.count++;
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Basic bot detection — reject non-email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check whitelist
  const { data: whitelisted } = await supabase
    .from("signup_whitelist")
    .select("status")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (whitelisted?.status === "approved") {
    return NextResponse.json({ allowed: true });
  }

  if (whitelisted?.status === "pending") {
    return NextResponse.json({
      allowed: false,
      message: "Votre demande d'accès est en attente de validation.",
    });
  }

  // Not in whitelist — auto-add as pending request
  await supabase
    .from("signup_whitelist")
    .upsert(
      { email: email.toLowerCase().trim(), status: "pending" },
      { onConflict: "email", ignoreDuplicates: true }
    );

  return NextResponse.json({
    allowed: false,
    message: "Demande d'accès envoyée. Un administrateur validera votre inscription.",
  });
}
