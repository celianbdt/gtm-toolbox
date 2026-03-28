import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarWrapper } from "@/components/layout/sidebar-wrapper";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  let workspaces: { id: string; name: string; slug: string; color: string }[] = [];

  try {
    const { data } = await supabase
      .from("workspaces")
      .select("id, name, slug, color")
      .order("created_at", { ascending: true });
    workspaces = data ?? [];
  } catch {
    // Tables not yet created — run the migration first
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <SidebarWrapper workspaces={workspaces} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
