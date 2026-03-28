import { NextRequest, NextResponse } from "next/server";

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json() as { url: string };

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const docId = extractDocId(url);
    if (!docId) {
      return NextResponse.json({ error: "Invalid Google Docs URL" }, { status: 400 });
    }

    // Use the public export URL (works for docs shared publicly or with link)
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

    const res = await fetch(exportUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GTMToolbox/1.0)" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to access document. Make sure it is shared publicly or with 'anyone with the link'." },
        { status: 400 }
      );
    }

    const text = await res.text();

    // Try to extract title from URL or first line
    const urlTitle = url.split("/document/")[0].split("/").pop() ?? "";
    const firstLine = text.split("\n").find((l) => l.trim()) ?? "";
    const title = firstLine.length < 80 ? firstLine : urlTitle || "Google Doc";

    return NextResponse.json({ text: text.trim(), title });
  } catch (error) {
    console.error("Google Docs import error:", error);
    return NextResponse.json({ error: "Failed to import from Google Docs" }, { status: 500 });
  }
}
