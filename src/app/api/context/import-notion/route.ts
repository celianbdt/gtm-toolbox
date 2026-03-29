import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";

type NotionBlock = {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

type NotionRichText = {
  plain_text: string;
};

function extractPageId(input: string): string | null {
  // Handle full URLs: https://www.notion.so/Title-{id} or https://notion.so/{workspace}/{id}
  const urlMatch = input.match(/([a-f0-9]{32}|[a-f0-9-]{36})(?:\?|$)/);
  if (urlMatch) return urlMatch[1].replace(/-/g, "");
  // Handle raw IDs
  const idMatch = input.match(/^([a-f0-9]{32}|[a-f0-9-]{36})$/);
  if (idMatch) return idMatch[1].replace(/-/g, "");
  return null;
}

function richTextToString(richText: NotionRichText[]): string {
  return (richText ?? []).map((t) => t.plain_text).join("");
}

function blockToText(block: NotionBlock): string {
  const type = block.type;
  const data = block[type];
  if (!data) return "";

  switch (type) {
    case "paragraph":
      return richTextToString(data.rich_text);
    case "heading_1":
      return `# ${richTextToString(data.rich_text)}`;
    case "heading_2":
      return `## ${richTextToString(data.rich_text)}`;
    case "heading_3":
      return `### ${richTextToString(data.rich_text)}`;
    case "bulleted_list_item":
      return `• ${richTextToString(data.rich_text)}`;
    case "numbered_list_item":
      return `- ${richTextToString(data.rich_text)}`;
    case "quote":
      return `> ${richTextToString(data.rich_text)}`;
    case "callout":
      return richTextToString(data.rich_text);
    case "code":
      return `\`\`\`\n${richTextToString(data.rich_text)}\n\`\`\``;
    case "divider":
      return "---";
    default:
      return data.rich_text ? richTextToString(data.rich_text) : "";
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { pageUrl, token } = await request.json() as { pageUrl: string; token: string };

    if (!pageUrl || !token) {
      return NextResponse.json({ error: "pageUrl and token are required" }, { status: 400 });
    }

    const pageId = extractPageId(pageUrl);
    if (!pageId) {
      return NextResponse.json({ error: "Invalid Notion page URL or ID" }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    };

    // Fetch page metadata for title
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
    if (!pageRes.ok) {
      const err = await pageRes.json();
      return NextResponse.json(
        { error: err.message ?? "Failed to fetch Notion page" },
        { status: pageRes.status }
      );
    }
    const page = await pageRes.json();

    // Extract title from page properties
    let title = "Notion page";
    const props = page.properties ?? {};
    const titleProp =
      props.title ?? props.Title ?? props.Name ??
      Object.values(props).find((p: unknown) => (p as NotionBlock).type === "title");
    if (titleProp && (titleProp as NotionBlock).title) {
      title = richTextToString((titleProp as NotionBlock).title) || title;
    }

    // Fetch blocks
    const blocksRes = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
      { headers }
    );
    if (!blocksRes.ok) {
      return NextResponse.json({ error: "Failed to fetch page content" }, { status: 500 });
    }
    const blocksData = await blocksRes.json();
    const blocks: NotionBlock[] = blocksData.results ?? [];

    const lines = blocks
      .map(blockToText)
      .filter(Boolean);

    const text = lines.join("\n\n");

    return NextResponse.json({ text, title });
  } catch (error) {
    console.error("Notion import error:", error);
    return NextResponse.json({ error: "Failed to import from Notion" }, { status: 500 });
  }
}
