"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  color: string;
  logo_url: string | null;
  mission_stage: string;
};

export function SidebarWrapper({ workspaces }: { workspaces: Workspace[] }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const currentSlug = segments[0];
  const currentWorkspace = workspaces.find((ws) => ws.slug === currentSlug);

  return (
    <AppSidebar workspaces={workspaces} currentWorkspace={currentWorkspace} />
  );
}
