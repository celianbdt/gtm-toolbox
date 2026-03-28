"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { DebateSetup } from "@/components/debate/setup/debate-setup";
import { DebateArena } from "@/components/debate/arena/debate-arena";

export default function StrategyDebatePage() {
  const workspace = useWorkspace();
  const [sessionId, setSessionId] = useState<string | null>(null);

  if (!sessionId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <DebateSetup workspaceId={workspace.id} onSessionCreated={setSessionId} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <DebateArena sessionId={sessionId} workspaceId={workspace.id} />
    </div>
  );
}
