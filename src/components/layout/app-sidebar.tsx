"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import {
  FileText,
  Bot,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
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
import { Badge } from "@/components/ui/badge";
import { tools } from "@/lib/tools/registry";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

function getIcon(iconName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  return icons[iconName] ?? LucideIcons.Box;
}

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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const workspaceLinks = [
    { label: "Context", href: `/${wsSlug}/context`, icon: FileText },
    { label: "Agents", href: `/${wsSlug}/agents`, icon: Bot },
    { label: "Settings", href: `/${wsSlug}/settings`, icon: Settings },
  ];

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
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: currentWorkspace.color }}
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
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: ws.color }}
                      />
                      {ws.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild>
                  <Link href="/workspaces">
                    <Plus className="size-4" />
                    New workspace
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {wsSlug && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Tools</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tools.map((tool) => {
                    const Icon = getIcon(tool.icon);
                    const href = `/${wsSlug}/tools/${tool.href}`;
                    const isActive = pathname.startsWith(href);
                    const isComingSoon = tool.status === "coming-soon";

                    return (
                      <SidebarMenuItem key={tool.id}>
                        <SidebarMenuButton
                          asChild={!isComingSoon}
                          isActive={isActive}
                          disabled={isComingSoon}
                          tooltip={tool.description}
                        >
                          {isComingSoon ? (
                            <>
                              <Icon className="size-4" />
                              <span>{tool.name}</span>
                              <Badge
                                variant="secondary"
                                className="ml-auto text-[10px] px-1.5 py-0"
                              >
                                Soon
                              </Badge>
                            </>
                          ) : (
                            <Link href={href}>
                              <Icon className="size-4" />
                              <span>{tool.name}</span>
                            </Link>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspaceLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                      <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={link.href}>
                            <link.icon className="size-4" />
                            <span>{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
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
