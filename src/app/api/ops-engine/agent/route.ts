import { NextRequest, NextResponse } from "next/server";
import { streamText, stepCountIs } from "ai";
import { requireAuth } from "@/lib/supabase/auth";
import { getWorkspaceAPIKeys, createWorkspaceAnthropic } from "@/lib/ai/provider";
import { createOpsAgentTools } from "@/lib/ops-engine/agents";

type SSEEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_call_start"; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: "tool_call_result"; toolCallId: string; result: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const OPS_AGENT_SYSTEM_PROMPT = `You are an expert GTM Ops Engine assistant. Your job is to help users create and configure ops tables that capture signals, enrich company/contact data, and score leads automatically.

## Your Workflow
Always follow this order:
1. **Create a table** with a clear, descriptive name
2. **Add columns** — start with static/signal columns, then enrichers, then AI columns
3. **Configure scoring** rules based on the columns you created
4. **Add rows** if the user provided data or use search_web to find prospects
5. **Trigger enrichment** once everything is set up

## Available Signal Sources (signal_input columns)
- **crunchbase**: Funding rounds, company profiles, investors. Best for: funding signals, company financials.
- **linkedin_jobs**: Job postings that indicate growth/hiring. Best for: hiring intent signals.
- **snitcher**: Website visitor identification. Best for: intent signals from anonymous traffic.
- **newsapi**: News mentions, press releases. Best for: awareness signals, PR monitoring.
- **proxycurl**: LinkedIn profile data. Best for: people data, company profiles.

## Available Enrichment Providers (enricher columns)
Use waterfall config to try multiple providers in order. The system will try each provider until it gets a result.

### Contact Finding
- **apollo**: Best first choice for finding contacts. Fields: email, phone, title, linkedin_url. High coverage for US/EU.
- **icypeas**: Good European coverage. Fields: email, phone.
- **hunter**: Email finding specialist. Fields: email. Good for domain-based search.
- **dropcontact**: Strong in France/Europe. Fields: email, phone, company.
- **datagma**: B2B contact data. Fields: email, phone, company_info.
- **fullenrich**: Multi-source waterfall. Fields: email, phone, linkedin_url.

### Company Enrichment
- **clearbit**: Company firmographics. Fields: industry, employee_count, revenue, tech_stack.
- **brandfetch**: Brand assets and info. Fields: logo, colors, description.
- **builtwith**: Technology detection. Fields: tech_stack, cms, analytics.
- **wappalyzer**: Technology detection (alternative). Fields: technologies, categories.

### Research
- **proxycurl**: LinkedIn enrichment. Fields: profile_data, company_data.
- **firecrawl**: Web scraping. Fields: page_content, structured_data.
- **serper**: Google search results. Fields: search_results, snippets.

## Waterfall Concept
For enricher columns, configure a waterfall: an ordered list of providers to try. Example for finding emails:
\`\`\`json
{
  "waterfall": [
    { "provider": "apollo", "fields": ["email", "phone"], "timeout_ms": 5000 },
    { "provider": "hunter", "fields": ["email"], "timeout_ms": 5000 },
    { "provider": "dropcontact", "fields": ["email", "phone"], "timeout_ms": 8000 }
  ],
  "cache_ttl_days": 30
}
\`\`\`

## AI Columns (ai_column)
LLM-generated analysis on each row. Config:
\`\`\`json
{
  "prompt": "Analyze this company and rate its fit with our ICP on a scale of 1-10. Consider: {{industry}}, {{employee_count}}, {{funding_stage}}",
  "model": "claude-haiku-4-5",
  "output_type": "text"
}
\`\`\`

## Scoring Rules
Each rule references a column_key and uses an operator to evaluate. Available operators:
- **equals / not_equals**: Exact match
- **contains / not_contains**: Substring match
- **greater_than / less_than**: Numeric comparison
- **within_days**: Date recency (value = number of days)
- **matches_list**: Value matches one of a list
- **is_empty / is_not_empty**: Null check
- **ai_evaluation**: LLM-based scoring (requires ai_prompt)

### Score Impact Guidelines
- Strong positive signal: +20 to +30 points
- Moderate positive signal: +10 to +15 points
- Weak positive signal: +5 points
- Negative signal: -10 to -20 points

### Default Tier Thresholds
- ignored: 0 (score < 20)
- cold: 20 (score 20-39)
- warm: 40 (score 40-69)
- hot: 70 (score 70-84)
- priority: 85 (score >= 85)

## Column Key Naming Convention
Use lowercase with underscores: company_name, funding_amount, contact_email, linkedin_url, icp_fit_score, etc.

## Best Practices
- Always include basic static columns: company_name, domain/website
- Add signal columns relevant to the user's request
- Configure enricher waterfalls with 2-3 providers for redundancy
- Use AI columns for qualitative analysis that providers can't give
- Create 4-8 scoring rules that reflect the user's priorities
- If the user mentions a geography, use it in scoring (e.g., +20 for France)
- If the user mentions a funding stage, use it in scoring
- Explain what you're doing at each step so the user understands the configuration`;

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { workspace_id, prompt } = body as {
    workspace_id: string;
    prompt: string;
  };

  if (!workspace_id || !prompt) {
    return NextResponse.json(
      { error: "workspace_id and prompt are required" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        const keys = await getWorkspaceAPIKeys(workspace_id);
        const anthropic = createWorkspaceAnthropic(keys);
        const tools = createOpsAgentTools(workspace_id);

        const result = streamText({
          model: anthropic("claude-sonnet-4-5") as Parameters<typeof streamText>[0]["model"],
          system: OPS_AGENT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
          tools,
          stopWhen: stepCountIs(15),
          experimental_onToolCallStart: ({ toolCall }) => {
            const tc = toolCall as { toolCallId: string; toolName: string; args?: Record<string, unknown> };
            send({
              type: "tool_call_start",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.args ?? {},
            });
          },
          experimental_onToolCallFinish: ({ toolCall }) => {
            const tc = toolCall as { toolCallId: string; result?: unknown };
            send({
              type: "tool_call_result",
              toolCallId: tc.toolCallId,
              result: tc.result,
            });
          },
        });

        for await (const delta of result.textStream) {
          if (delta) {
            send({ type: "text_delta", delta });
          }
        }

        send({ type: "done" });
      } catch (error) {
        console.error("Ops agent error:", error);
        const message =
          error instanceof Error ? error.message : "An error occurred";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
