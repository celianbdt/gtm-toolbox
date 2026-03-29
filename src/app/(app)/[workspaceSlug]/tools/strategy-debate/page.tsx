"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { DebateSetup } from "@/components/debate/setup/debate-setup";
import { DebateArena } from "@/components/debate/arena/debate-arena";
import { DebateDeliverables } from "@/components/debate/outputs/debate-deliverables";
import { SavedSessions } from "@/components/debate/saved-sessions";

type ViewState =
  | { view: "home"; tab: "new" | "saved" }
  | { view: "arena"; sessionId: string }
  | { view: "deliverables"; sessionId: string };

export default function StrategyDebatePage() {
  const workspace = useWorkspace();
  const [state, setState] = useState<ViewState>({ view: "home", tab: "new" });

  if (state.view === "home") {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
              New Debate
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
        <div className="flex-1 min-h-0 overflow-hidden">
          {state.tab === "new" ? (
            <DebateSetup
              workspaceId={workspace.id}
              onSessionCreated={(sessionId) =>
                setState({ view: "arena", sessionId })
              }
            />
          ) : (
            <SavedSessions
              workspaceId={workspace.id}
              onSelectSession={(sessionId, status) =>
                setState(
                  status === "concluded"
                    ? { view: "deliverables", sessionId }
                    : { view: "arena", sessionId }
                )
              }
            />
          )}
        </div>
      </div>
    );
  }

  if (state.view === "arena") {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DebateArena
          sessionId={state.sessionId}
          workspaceId={workspace.id}
          onConcluded={(sessionId) =>
            setState({ view: "deliverables", sessionId })
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <DebateDeliverables
        sessionId={state.sessionId}
        workspaceId={workspace.id}
        onBackToDebate={() =>
          setState({ view: "arena", sessionId: state.sessionId })
        }
      />
    </div>
  );
}
