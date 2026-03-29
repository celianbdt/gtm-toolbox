import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceMember } from "@/lib/supabase/auth";
import { z } from "zod";

const AnalyzeSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      context: z.string(),
      reason: z.string(),
    })
  ),
  document_themes: z.array(
    z.object({
      theme: z.string(),
      source_documents: z.array(z.string()),
      description: z.string(),
    })
  ),
});

const RestructureSchema = z.object({
  documents: z.array(
    z.object({
      title: z.string(),
      doc_type: z.string(),
      content: z.string(),
      sources: z.array(z.string()),
    })
  ),
  changelog: z.array(z.string()),
});

function formatDocsForPrompt(
  docs: { title: string; doc_type: string; content: string }[]
): string {
  return docs
    .map(
      (d, i) =>
        `--- Document ${i + 1}: "${d.title}" [type: ${d.doc_type}] ---\n${d.content}`
    )
    .join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, action } = body as {
      workspaceId: string;
      action: "analyze" | "restructure";
    };

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    if (!workspaceId || !action) {
      return NextResponse.json(
        { error: "Missing workspaceId or action" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: docs, error: dbError } = await supabase
      .from("context_documents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (dbError) throw dbError;
    if (!docs || docs.length === 0) {
      return NextResponse.json(
        { error: "No documents found in this workspace" },
        { status: 400 }
      );
    }

    const formattedDocs = formatDocsForPrompt(docs);

    if (action === "analyze") {
      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-5"),
        schema: AnalyzeSchema,
        prompt: `You are an expert GTM (Go-To-Market) context analyst. Your job is to analyze a collection of context documents from a workspace and identify areas that may need updating.

Here are all the context documents:

${formattedDocs}

Your tasks:
1. Identify information that may be outdated: dates, people/POCs, deals, metrics, market data, competitor info, pricing, team structures, etc.
2. Generate clarifying questions for the user about things that may have changed or need verification.
3. Identify thematic groups across documents (e.g., "Product positioning", "ICP definition", "Competitive landscape", etc.)

For each question:
- Give it a unique id (q1, q2, q3...)
- Write a clear, specific question in French
- Reference which document/section it relates to
- Explain briefly why this might be outdated or need updating

For themes, group related content that spans multiple documents.

Be thorough but practical — focus on questions that actually matter for GTM execution.`,
      });

      return NextResponse.json({
        questions: object.questions,
        document_themes: object.document_themes,
      });
    }

    if (action === "restructure") {
      const { answers, document_themes } = body as {
        answers: { id: string; answer: string }[];
        document_themes: { theme: string; source_documents: string[]; description: string }[];
      };

      const answersText =
        answers && answers.length > 0
          ? answers
              .filter((a) => a.answer.trim())
              .map((a) => `- Question ${a.id}: ${a.answer}`)
              .join("\n")
          : "No answers provided — keep existing information as-is.";

      const themesText =
        document_themes && document_themes.length > 0
          ? document_themes
              .map(
                (t) =>
                  `- Theme: "${t.theme}" (from: ${t.source_documents.join(", ")}): ${t.description}`
              )
              .join("\n")
          : "";

      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-5"),
        schema: RestructureSchema,
        prompt: `You are an expert GTM context architect. Your job is to restructure a collection of workspace documents into clean, well-organized thematic documents.

Here are the original documents:

${formattedDocs}

${themesText ? `Identified themes:\n${themesText}\n` : ""}

User's answers to clarifying questions:
${answersText}

Your tasks:
1. Restructure ALL the content into clean thematic markdown documents
2. Each document should have:
   - A clear, descriptive title in French
   - A doc_type: one of "icp", "product", "competitor", or "general"
   - Well-structured markdown content with headers, bullet points, etc.
   - A list of which original document titles were used as sources
3. Preserve ALL important information from the originals
4. Update information based on user answers
5. Merge related content from different documents into coherent themes
6. Remove redundancy and contradictions (preferring newer/user-corrected info)
7. Generate a changelog listing what was changed, merged, or updated

Write all document content in the same language as the originals (likely French).
The changelog should also be in French.`,
      });

      return NextResponse.json({
        documents: object.documents,
        changelog: object.changelog,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Context remodel failed:", error);
    return NextResponse.json(
      { error: "Remodel failed" },
      { status: 500 }
    );
  }
}
