"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import {
  FileText,
  Bot,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  LayoutGrid,
  FileBarChart,
  StickyNote,
  Kanban,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tools, getToolsByStage } from "@/lib/tools/registry";
import { createClient } from "@/lib/supabase/client";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { WorkspaceLogo } from "@/components/workspace/workspace-logo";
import { useRouter } from "next/navigation";
import type { ToolStage } from "@/lib/tools/types";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  color: string;
  logo_url: string | null;
  mission_stage: string;
};

function getIcon(iconName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  return icons[iconName] ?? LucideIcons.Box;
}

const STAGE_CONFIG: Record<ToolStage, { label: string; icon: typeof LucideIcons.Search; color: string }> = {
  discovery: { label: "Discovery", icon: LucideIcons.Search, color: "text-blue-400" },
  foundation: { label: "Foundation", icon: LucideIcons.Layers, color: "text-violet-400" },
  optimization: { label: "Optimization", icon: LucideIcons.TrendingUp, color: "text-amber-400" },
  scaling: { label: "Scaling", icon: LucideIcons.Rocket, color: "text-emerald-400" },
};

const STAGES: ToolStage[] = ["discovery", "foundation", "optimization", "scaling"];

export function AppSidebar({
  workspaces,
  currentWorkspace,
}: {
  workspaces: Workspace[];
  currentWorkspace?: Workspace;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const wsSlug = currentWorkspace?.slug;
  const [createOpen, setCreateOpen] = useState(false);
  const [openStages, setOpenStages] = useState<Set<ToolStage>>(new Set(STAGES));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleStage(stage: ToolStage) {
    setOpenStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-10">
                  {currentWorkspace ? (
                    <>
                      <WorkspaceLogo
                        logoUrl={currentWorkspace.logo_url}
                        color={currentWorkspace.color}
                        name={currentWorkspace.name}
                        size="sm"
                      />
                      <span className="font-semibold truncate">
                        {currentWorkspace.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      Select workspace
                    </span>
                  )}
                  <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {workspaces.map((ws) => (
                  <DropdownMenuItem key={ws.id} asChild>
                    <Link href={`/${ws.slug}`}>
                      <WorkspaceLogo
                        logoUrl={ws.logo_url}
                        color={ws.color}
                        name={ws.name}
                        size="xs"
                      />
                      {ws.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  New workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {wsSlug && (
          <>
            {/* Tools grouped by stage */}
            {STAGES.map((stage) => {
              const config = STAGE_CONFIG[stage];
              const StageIcon = config.icon;
              const stageTools = getToolsByStage(stage);
              const isOpen = openStages.has(stage);

              if (stageTools.length === 0) return null;

              return (
                <SidebarGroup key={stage}>
                  <button
                    onClick={() => toggleStage(stage)}
                    className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-accent/50 rounded-md transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className={`size-3 ${config.color}`} />
                    ) : (
                      <ChevronRight className={`size-3 ${config.color}`} />
                    )}
                    <StageIcon className={`size-3.5 ${config.color}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </span>
                  </button>

                  {isOpen && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {stageTools.map((tool) => {
                          const Icon = getIcon(tool.icon);
                          const href = `/${wsSlug}/tools/${tool.href}`;
                          const isActive = pathname.startsWith(href);

                          return (
                            <SidebarMenuItem key={tool.id}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={tool.description}
                                className="pl-8"
                              >
                                <Link href={href}>
                                  <Icon className="size-4" />
                                  <span>{tool.name}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              );
            })}

            <SidebarSeparator />

            {/* Workspace sections */}
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(`/${wsSlug}/project`)}>
                      <Link href={`/${wsSlug}/project`}>
                        <Kanban className="size-4" />
                        <span>Project</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(`/${wsSlug}/ops`)}>
                      <Link href={`/${wsSlug}/ops`}>
                        <StickyNote className="size-4" />
                        <span>Notes</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(`/${wsSlug}/context`)}>
                      <Link href={`/${wsSlug}/context`}>
                        <FileText className="size-4" />
                        <span>Context</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(`/${wsSlug}/agents`)}>
                      <Link href={`/${wsSlug}/agents`}>
                        <Bot className="size-4" />
                        <span>Agents</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(`/${wsSlug}/settings`)}>
                      <Link href={`/${wsSlug}/settings`}>
                        <Settings className="size-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/workspaces">
                <LayoutGrid className="size-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/workspaces/reports">
                <FileBarChart className="size-4" />
                <span>Reports</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="size-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
