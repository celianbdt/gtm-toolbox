import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { isUrlSafe } from "@/lib/utils/url-validator";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "";
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { url } = await request.json() as { url: string };

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    if (!isUrlSafe(url)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GTMToolbox/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${res.status}` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text")) {
      return NextResponse.json(
        { error: "URL does not return text content" },
        { status: 400 }
      );
    }

    const html = await res.text();
    const title = extractTitle(html);
    const text = stripHtml(html);

    return NextResponse.json({ text, title });
  } catch (error) {
    console.error("URL scrape error:", error);
    return NextResponse.json({ error: "Failed to scrape URL" }, { status: 500 });
  }
}
