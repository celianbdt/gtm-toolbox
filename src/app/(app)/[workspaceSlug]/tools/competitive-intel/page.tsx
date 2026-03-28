"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { CISetup } from "@/components/competitive-intel/setup/ci-setup";
import { AnalysisArena } from "@/components/competitive-intel/arena/analysis-arena";
import { DeliverablesDashboard } from "@/components/competitive-intel/outputs/deliverables-dashboard";
import { SavedSessions } from "@/components/competitive-intel/saved-sessions";

type ViewState =
  | { view: "home"; tab: "new" | "saved" }
  | { view: "arena"; sessionId: string }
  | { view: "deliverables"; sessionId: string };

export default function CompetitiveIntelPage() {
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
              New Analysis
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
            <CISetup
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
        <AnalysisArena
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
      <DeliverablesDashboard
        sessionId={state.sessionId}
        onBack={() => setState({ view: "home", tab: "saved" })}
      />
    </div>
  );
}
