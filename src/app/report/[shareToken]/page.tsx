import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicReportView } from "@/components/report/public-report-view";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const supabase = createAdminClient();

  // Fetch report by share_token (service role bypasses RLS)
  const { data: report, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("share_token", shareToken)
    .single();

  if (error || !report) {
    return notFound();
  }

  // Fetch workspace info for branding
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, color")
    .eq("id", report.workspace_id)
    .single();

  return (
    <PublicReportView
      report={report}
      workspaceName={workspace?.name ?? "Workspace"}
      workspaceColor={workspace?.color ?? "#3b82f6"}
    />
  );
}
