// ── Bridge Analysis Prompts ──
// Per-tool prompts that translate strategy session outputs into ops table configurations.

type SessionOutput = {
  output_type: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
};

const AVAILABLE_SIGNAL_SOURCES = [
  "crunchbase — funding rounds, company data",
  "proxycurl — LinkedIn profile changes, job changes",
  "linkedin_jobs — job postings by company",
  "snitcher — anonymous website visitor identification",
  "newsapi — news mentions and PR",
  "csv_import — manual CSV uploads",
  "crm_import — import from HubSpot, Attio, Pipedrive, Folk",
];

const AVAILABLE_ENRICHERS = [
  "apollo — email, phone, company data",
  "icypeas — email verification and finding",
  "fullenrich — multi-source email enrichment",
  "dropcontact — GDPR-compliant email/phone",
  "datagma — B2B contact enrichment",
  "hunter — email finder and verifier",
  "clearbit — company firmographics (size, revenue, industry)",
  "proxycurl — LinkedIn profile data",
  "builtwith — technology stack detection",
  "wappalyzer — technology stack detection",
];

function formatOutputs(outputs: SessionOutput[]): string {
  return outputs
    .map(
      (o) =>
        `### ${o.title} (${o.output_type})\n${o.description}\n${
          o.metadata ? `Metadata: ${JSON.stringify(o.metadata, null, 2)}` : ""
        }`
    )
    .join("\n\n");
}

const TOOL_PROMPTS: Record<string, (outputs: SessionOutput[]) => string> = {
  "icp-audit": (outputs) => `You are a GTM ops architect. A strategy team just completed an ICP Audit session. Their analysis produced the following outputs:

${formatOutputs(outputs)}

Based on these ICP findings, generate an ops table configuration that will help the team ACTION these insights. Focus on:
- Extract the ICP criteria (target industries, company sizes, signals of fit) from the outputs
- Propose either an "ICP Discovery" style table (to find new companies matching the ICP) or a "Funding Trigger" style table (if funding signals are relevant)
- Customize scoring rules based on the specific ICP criteria identified (industries, sizes, signals)
- Include enrichment columns for email/phone and AI columns for personalized outreach

The table should turn the strategic ICP definition into an operational lead qualification pipeline.

Available signal sources:
${AVAILABLE_SIGNAL_SOURCES.map((s) => `- ${s}`).join("\n")}

Available enrichers:
${AVAILABLE_ENRICHERS.map((e) => `- ${e}`).join("\n")}`,

  "competitive-intel": (outputs) => `You are a GTM ops architect. A strategy team just completed a Competitive Intelligence session. Their analysis produced the following outputs:

${formatOutputs(outputs)}

Based on these competitive insights, generate an ops table configuration that will help the team exploit competitive weaknesses. Focus on:
- Extract competitor weaknesses and opportunities from the outputs
- Propose either a "Champion Change" table (to track people leaving competitors) or a "Hiring Intent" table (to detect competitors' customers hiring for replacement roles)
- Create scoring rules that prioritize leads coming from competitor accounts
- Include AI columns that craft competitive displacement messaging

The table should operationalize competitive intelligence into actionable lead generation.

Available signal sources:
${AVAILABLE_SIGNAL_SOURCES.map((s) => `- ${s}`).join("\n")}

Available enrichers:
${AVAILABLE_ENRICHERS.map((e) => `- ${e}`).join("\n")}`,

  "channel-planner": (outputs) => `You are a GTM ops architect. A strategy team just completed a Channel Planning session. Their analysis produced the following outputs:

${formatOutputs(outputs)}

Based on these channel recommendations, generate an ops table configuration that will help execute the recommended channels. Focus on:
- Extract the recommended channels and tactics from the outputs
- If outbound is recommended: propose a signal-based table (Funding Trigger, Hiring Intent, or Web Intent depending on the signals mentioned)
- If inbound/content is recommended: propose a Web Intent table to track visitor engagement
- If events are recommended: propose an Event Leads table
- Customize scoring to prioritize the signals that align with recommended channels
- Include enrichment and AI personalization columns

The table should be the operational execution layer for the channel strategy.

Available signal sources:
${AVAILABLE_SIGNAL_SOURCES.map((s) => `- ${s}`).join("\n")}

Available enrichers:
${AVAILABLE_ENRICHERS.map((e) => `- ${e}`).join("\n")}`,

  "messaging-lab": (outputs) => `You are a GTM ops architect. A strategy team just completed a Messaging Lab session. Their analysis produced the following outputs:

${formatOutputs(outputs)}

Based on these messaging frameworks, generate an ops table configuration that uses AI columns to apply these messaging insights at scale. Focus on:
- Extract the key messaging frameworks, value props, and angles from the outputs
- Propose a lead processing table with strong AI column configuration
- The AI columns should use the actual messaging frameworks from the session to generate personalized outreach
- Include columns for: lead data, enrichment, and multiple AI-generated content pieces (opener, value prop, CTA)
- Scoring should prioritize leads where personalization quality is highest

The table should operationalize messaging frameworks into a personalization engine.

Available signal sources:
${AVAILABLE_SIGNAL_SOURCES.map((s) => `- ${s}`).join("\n")}

Available enrichers:
${AVAILABLE_ENRICHERS.map((e) => `- ${e}`).join("\n")}`,

  "outbound-builder": (outputs) => `You are a GTM ops architect. A strategy team just completed an Outbound Builder session. Their analysis produced the following outputs:

${formatOutputs(outputs)}

Based on this outbound campaign strategy, generate an ops table configuration that will power the campaign execution. Focus on:
- Extract the campaign strategy, target segments, and sequence insights from the outputs
- Propose a table that matches the outbound approach (cold outbound → Funding Trigger or ICP Discovery; warm outbound → Champion Change or Web Intent)
- Include enrichment columns for the data points needed by the campaign
- Add AI columns that generate sequence-specific content (first touch, follow-up angles)
- Scoring should align with the campaign's prioritization criteria

The table should be the lead pipeline that feeds the outbound sequences.

Available signal sources:
${AVAILABLE_SIGNAL_SOURCES.map((s) => `- ${s}`).join("\n")}

Available enrichers:
${AVAILABLE_ENRICHERS.map((e) => `- ${e}`).join("\n")}`,
};

const DEFAULT_PROMPT = (outputs: SessionOutput[]) => `You are a GTM ops architect. A strategy session produced the following outputs:

${formatOutputs(outputs)}

Based on these insights, generate an ops table configuration that will help operationalize these findings. Include appropriate signal sources, enrichment columns, AI columns for personalization, and scoring rules.

Available signal sources:
${AVAILABLE_SIGNAL_SOURCES.map((s) => `- ${s}`).join("\n")}

Available enrichers:
${AVAILABLE_ENRICHERS.map((e) => `- ${e}`).join("\n")}`;

export function getBridgePrompt(
  toolId: string,
  outputs: SessionOutput[]
): string {
  const builder = TOOL_PROMPTS[toolId] ?? DEFAULT_PROMPT;
  return builder(outputs);
}
