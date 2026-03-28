import fs from "fs/promises";
import path from "path";

export type KnowledgeBaseId = "gtm-acquisition" | "sales-top-performer";

const knowledgeFiles: Record<KnowledgeBaseId, string> = {
  "gtm-acquisition": "gtm-acquisition.md",
  "sales-top-performer": "sales-top-performer.md",
};

/**
 * Load a knowledge base markdown file by id.
 * Returns the raw markdown content to be injected as system context for AI tools.
 */
export async function loadKnowledge(id: KnowledgeBaseId): Promise<string> {
  const filePath = path.join(process.cwd(), "src/lib/knowledge", knowledgeFiles[id]);
  return fs.readFile(filePath, "utf-8");
}

/**
 * Load multiple knowledge bases at once.
 */
export async function loadKnowledgeBases(
  ids: KnowledgeBaseId[]
): Promise<Record<KnowledgeBaseId, string>> {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await loadKnowledge(id)] as const)
  );
  return Object.fromEntries(entries) as Record<KnowledgeBaseId, string>;
}

/**
 * Mapping of which knowledge bases are relevant to which tool categories.
 */
export const toolKnowledgeMap: Record<string, KnowledgeBaseId[]> = {
  // Strategy tools benefit from both GTM and Sales knowledge
  "strategy-debate": ["gtm-acquisition", "sales-top-performer"],
  "channel-planner": ["gtm-acquisition"],

  // Analysis tools
  "icp-audit": ["gtm-acquisition"],
  "competitive-intel": ["gtm-acquisition", "sales-top-performer"],

  // Messaging benefits from sales techniques
  "messaging-lab": ["gtm-acquisition", "sales-top-performer"],

  // Outbound is heavily sales-oriented
  "outbound-builder": ["gtm-acquisition", "sales-top-performer"],
};

/**
 * Get the relevant knowledge base content for a specific tool.
 */
export async function getToolKnowledge(toolId: string): Promise<string> {
  const kbIds = toolKnowledgeMap[toolId];
  if (!kbIds || kbIds.length === 0) return "";

  const contents = await Promise.all(kbIds.map(loadKnowledge));
  return contents.join("\n\n---\n\n");
}
