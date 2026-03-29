import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceMember } from "@/lib/supabase/auth";
import { isUrlSafe } from "@/lib/utils/url-validator";

// ─── CRM data → markdown documents ──────────────────────────────────────────

function formatDeals(deals: Record<string, unknown>[]): string {
  if (!deals?.length) return "No deals found.";
  return deals
    .map((d: Record<string, unknown>) => {
      const name = d.name ?? d.title ?? "Untitled";
      const stage = d.stage ?? d.status ?? "unknown";
      const value = d.value ?? d.amount ?? d.deal_value ?? "N/A";
      const org = (d.organization as Record<string, unknown>)?.name ?? d.organization_name ?? "";
      const closeDate = d.expected_close_date ?? d.close_date ?? "";
      return `- **${name}** | ${org} | Stage: ${stage} | Value: ${value}${closeDate ? ` | Close: ${closeDate}` : ""}`;
    })
    .join("\n");
}

function formatContacts(persons: Record<string, unknown>[]): string {
  if (!persons?.length) return "No contacts found.";
  return persons
    .slice(0, 100) // Cap for context size
    .map((p: Record<string, unknown>) => {
      const name = p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      const org = (p.organization as Record<string, unknown>)?.name ?? p.organization_name ?? "";
      const role = p.role ?? p.job_title ?? p.title ?? "";
      const email = p.email ?? "";
      return `- **${name}**${role ? ` (${role})` : ""}${org ? ` @ ${org}` : ""}${email ? ` — ${email}` : ""}`;
    })
    .join("\n");
}

function formatOrganizations(orgs: Record<string, unknown>[]): string {
  if (!orgs?.length) return "No organizations found.";
  return orgs
    .map((o: Record<string, unknown>) => {
      const name = o.name ?? "Untitled";
      const industry = o.industry ?? "";
      const size = o.size ?? o.employee_count ?? "";
      const website = o.website ?? "";
      return `- **${name}**${industry ? ` | ${industry}` : ""}${size ? ` | Size: ${size}` : ""}${website ? ` | ${website}` : ""}`;
    })
    .join("\n");
}

function formatActivities(activities: Record<string, unknown>[]): string {
  if (!activities?.length) return "No recent activities.";
  return activities
    .slice(0, 50)
    .map((a: Record<string, unknown>) => {
      const type = a.type ?? a.activity_type ?? "activity";
      const subject = a.subject ?? a.title ?? a.description ?? "";
      const date = a.date ?? a.created_at ?? "";
      const contact = a.contact_name ?? a.person_name ?? "";
      return `- [${type}] ${subject}${contact ? ` — ${contact}` : ""}${date ? ` (${String(date).slice(0, 10)})` : ""}`;
    })
    .join("\n");
}

function formatKPIs(kpis: Record<string, unknown>): string {
  const lines: string[] = [];
  if (kpis.pipeline_total != null) lines.push(`- Pipeline total: ${kpis.pipeline_total}`);
  if (kpis.pipeline_weighted != null) lines.push(`- Pipeline weighted: ${kpis.pipeline_weighted}`);
  if (kpis.active_deals != null) lines.push(`- Active deals: ${kpis.active_deals}`);
  if (kpis.won_deals != null) lines.push(`- Won deals: ${kpis.won_deals}`);
  if (kpis.lost_deals != null) lines.push(`- Lost deals: ${kpis.lost_deals}`);
  if (kpis.activities_7d != null) lines.push(`- Activities (7 days): ${kpis.activities_7d}`);
  if (kpis.activities_30d != null) lines.push(`- Activities (30 days): ${kpis.activities_30d}`);
  if (kpis.avg_engagement_score != null) lines.push(`- Avg engagement score: ${kpis.avg_engagement_score}`);
  return lines.length ? lines.join("\n") : "No KPI data available.";
}

function formatStaleDeals(staleDeals: Record<string, unknown>[]): string {
  if (!staleDeals?.length) return "No stale deals.";
  return staleDeals
    .map((d: Record<string, unknown>) => {
      const name = d.name ?? d.title ?? "Untitled";
      const lastActivity = d.last_activity_date ?? d.last_activity ?? "unknown";
      const value = d.value ?? d.amount ?? "";
      return `- **${name}**${value ? ` (${value})` : ""} — Last activity: ${lastActivity}`;
    })
    .join("\n");
}

function formatTopAccounts(accounts: Record<string, unknown>[]): string {
  if (!accounts?.length) return "No top accounts data.";
  return accounts
    .map((a: Record<string, unknown>) => {
      const name = a.name ?? a.account_name ?? "Untitled";
      const score = a.score ?? a.engagement_score ?? a.activity_count ?? "";
      return `- **${name}**${score ? ` — Score: ${score}` : ""}`;
    })
    .join("\n");
}

function buildCRMDocuments(data: Record<string, unknown>): { title: string; content: string }[] {
  const docs: { title: string; content: string }[] = [];

  // 1. Pipeline & KPIs Overview
  const kpis = (data.kpis ?? data.metrics ?? {}) as Record<string, unknown>;
  const staleDeals = (data.stale_deals ?? []) as Record<string, unknown>[];
  const topAccounts = (data.top_accounts ?? data.top_accounts_by_activity ?? []) as Record<string, unknown>[];
  const engagementScoring = (data.engagement_scoring ?? {}) as Record<string, unknown>;

  let kpiContent = `# CRM — Pipeline & KPIs\n\n## Key Metrics\n${formatKPIs(kpis)}`;
  if (staleDeals.length) kpiContent += `\n\n## Stale Deals (no activity 14+ days)\n${formatStaleDeals(staleDeals)}`;
  if (topAccounts.length) kpiContent += `\n\n## Top Accounts\n${formatTopAccounts(topAccounts)}`;
  if (engagementScoring && Object.keys(engagementScoring).length) {
    const topEngaged = (engagementScoring.top_accounts ?? []) as Record<string, unknown>[];
    if (topEngaged.length) kpiContent += `\n\n## Top Engaged Accounts\n${formatTopAccounts(topEngaged)}`;
    if (engagementScoring.avg_score != null) kpiContent += `\n\nAverage engagement score: ${engagementScoring.avg_score}`;
  }
  docs.push({ title: "CRM — Pipeline & KPIs", content: kpiContent });

  // 2. Deals
  const deals = (data.deals ?? []) as Record<string, unknown>[];
  if (deals.length) {
    docs.push({
      title: "CRM — Deals",
      content: `# CRM — Active Deals\n\n${formatDeals(deals)}`,
    });
  }

  // 3. Contacts
  const persons = (data.persons ?? data.contacts ?? []) as Record<string, unknown>[];
  if (persons.length) {
    docs.push({
      title: "CRM — Contacts",
      content: `# CRM — Contacts (${persons.length} total)\n\n${formatContacts(persons)}`,
    });
  }

  // 4. Organizations
  const orgs = (data.organizations ?? data.companies ?? []) as Record<string, unknown>[];
  if (orgs.length) {
    docs.push({
      title: "CRM — Organizations",
      content: `# CRM — Organizations (${orgs.length} total)\n\n${formatOrganizations(orgs)}`,
    });
  }

  // 5. Activities
  const activities = (data.activities ?? []) as Record<string, unknown>[];
  if (activities.length) {
    docs.push({
      title: "CRM — Recent Activities",
      content: `# CRM — Recent Activities\n\n${formatActivities(activities)}`,
    });
  }

  // 6. Notes, contracts, projects (catch-all)
  const notes = (data.notes ?? []) as Record<string, unknown>[];
  const contracts = (data.contracts ?? []) as Record<string, unknown>[];
  const projects = (data.projects ?? []) as Record<string, unknown>[];
  if (notes.length || contracts.length || projects.length) {
    let extraContent = "# CRM — Notes, Contracts & Projects\n";
    if (notes.length) {
      extraContent += `\n## Notes (${notes.length})\n`;
      extraContent += notes.slice(0, 30).map((n: Record<string, unknown>) => {
        const title = n.title ?? n.subject ?? "";
        const body = n.content ?? n.body ?? "";
        return `### ${title}\n${String(body).slice(0, 500)}`;
      }).join("\n\n");
    }
    if (contracts.length) {
      extraContent += `\n\n## Contracts (${contracts.length})\n`;
      extraContent += contracts.map((c: Record<string, unknown>) => {
        return `- **${c.name ?? c.title ?? "Contract"}** | Status: ${c.status ?? "N/A"} | Value: ${c.value ?? "N/A"}`;
      }).join("\n");
    }
    if (projects.length) {
      extraContent += `\n\n## Projects (${projects.length})\n`;
      extraContent += projects.map((p: Record<string, unknown>) => {
        return `- **${p.name ?? p.title ?? "Project"}** | Status: ${p.status ?? "N/A"}`;
      }).join("\n");
    }
    docs.push({ title: "CRM — Notes, Contracts & Projects", content: extraContent });
  }

  return docs;
}

// ─── API Route ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, crmUrl, apiKey, updatedSince } = await request.json();

    if (!workspaceId || !crmUrl || !apiKey) {
      return NextResponse.json(
        { error: "workspaceId, crmUrl, and apiKey are required" },
        { status: 400 }
      );
    }

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    if (!isUrlSafe(crmUrl)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Build URL with optional incremental sync param
    let fetchUrl = crmUrl;
    if (updatedSince) {
      const separator = crmUrl.includes("?") ? "&" : "?";
      fetchUrl = `${crmUrl}${separator}updated_since=${updatedSince}`;
    }

    // Fetch CRM data
    const res = await fetch(fetchUrl, {
      headers: { "X-API-Key": apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `CRM API returned ${res.status}: ${text.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const crmData = await res.json() as Record<string, unknown>;

    // Transform CRM data into structured markdown documents
    const crmDocs = buildCRMDocuments(crmData);

    if (crmDocs.length === 0) {
      return NextResponse.json(
        { error: "No data found in CRM response" },
        { status: 422 }
      );
    }

    // Delete existing CRM docs for this workspace (replace with fresh data)
    const supabase = createAdminClient();
    await supabase
      .from("context_documents")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("doc_type", "crm");

    // Insert new CRM documents
    const inserts = crmDocs.map((doc) => ({
      workspace_id: workspaceId,
      title: doc.title,
      content: doc.content,
      doc_type: "crm" as const,
      metadata: {
        source: "crm-import",
        imported_at: new Date().toISOString(),
        incremental: !!updatedSince,
      },
    }));

    const { data: saved, error } = await supabase
      .from("context_documents")
      .insert(inserts)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      documents: saved,
      count: saved.length,
      summary: crmDocs.map((d) => d.title),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
