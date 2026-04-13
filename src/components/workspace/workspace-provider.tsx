"use client";

import { createContext, useContext } from "react";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  logo_url: string | null;
  mission_stage: "discovery" | "foundation" | "optimization" | "scaling";
  status: "active" | "paused" | "completed";
  priority: "urgent" | "normal" | "low";
  created_at: string;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
