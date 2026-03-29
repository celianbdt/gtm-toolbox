"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { CPSetup } from "@/components/channel-planner/setup/cp-setup";
import { PlanningArena } from "@/components/channel-planner/arena/planning-arena";
import { OutputsDashboard } from "@/components/channel-planner/outputs/outputs-dashboard";
import { SavedSessions } from "@/components/channel-planner/saved-sessions";

type ViewState =
  | { view: "home"; tab: "new" | "saved" }
  | { view: "arena"; sessionId: string }
  | { view: "deliverables"; sessionId: string };

export default function ChannelPlannerPage() {
  const workspace = useWorkspace();
  const [state, setState] = useState<ViewState>({ view: "home", tab: "new" });

  if (state.view === "home") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <div className="shrink-0 px-6 border-b border-border">
          <div className="flex gap-1 max-w-2xl mx-auto">
            <button
              onClick={() => setState({ view: "home", tab: "new" })}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                state.tab === "new"
                  ? "text-[#A78BFA] border-[#7C3AED]"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              New Plan
            </button>
            <button
              onClick={() => setState({ view: "home", tab: "saved" })}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                state.tab === "saved"
                  ? "text-[#A78BFA] border-[#7C3AED]"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              Saved Sessions
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {state.tab === "new" ? (
            <CPSetup
              workspaceId={workspace.id}
              onSessionCreated={(sessionId) =>
                setState({ view: "arena", sessionId })
              }
            />
          ) : (
            <SavedSessions
              workspaceId={workspace.id}
              onSelectSession={(sessionId) =>
                setState({ view: "deliverables", sessionId })
              }
            />
          )}
        </div>
      </div>
    );
  }

  if (state.view === "arena") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PlanningArena
          sessionId={state.sessionId}
          onComplete={() =>
            setState({ view: "deliverables", sessionId: state.sessionId })
          }
          onSaveExit={() =>
            setState({ view: "deliverables", sessionId: state.sessionId })
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <OutputsDashboard
        sessionId={state.sessionId}
        onBack={() => setState({ view: "home", tab: "saved" })}
      />
    </div>
  );
}
