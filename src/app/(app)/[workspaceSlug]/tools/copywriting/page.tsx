"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PenLine } from "lucide-react";
import { CWSetup } from "@/components/copywriting/setup/cw-setup";
import { CopywritingArena } from "@/components/copywriting/arena/copywriting-arena";
import { OutputsDashboard } from "@/components/copywriting/outputs/outputs-dashboard";
import { SavedSessions } from "@/components/copywriting/saved-sessions";

type ViewState =
  | { view: "home"; tab: "new" | "saved" }
  | { view: "arena"; sessionId: string }
  | { view: "outputs"; sessionId: string };

export default function CopywritingPage() {
  const workspace = useWorkspace();
  const [viewState, setViewState] = useState<ViewState>({
    view: "home",
    tab: "new",
  });

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {viewState.view !== "home" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewState({ view: "home", tab: "saved" })}
          >
            <ArrowLeft className="size-4 mr-1" />
            Retour
          </Button>
        )}
        <div className="flex items-center gap-2">
          <PenLine className="size-5 text-violet-400" />
          <h1 className="text-lg font-semibold">Copywriting</h1>
        </div>
      </div>

      {/* Home view */}
      {viewState.view === "home" && (
        <>
          <div className="flex items-center gap-1 mb-6 rounded-lg border border-border bg-card p-0.5 w-fit">
            <button
              onClick={() => setViewState({ view: "home", tab: "new" })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewState.tab === "new"
                  ? "bg-violet-500/10 text-violet-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Nouvelle sequence
            </button>
            <button
              onClick={() => setViewState({ view: "home", tab: "saved" })}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                viewState.tab === "saved"
                  ? "bg-violet-500/10 text-violet-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sessions sauvees
            </button>
          </div>

          {viewState.tab === "new" ? (
            <CWSetup
              workspaceId={workspace.id}
              onSessionCreated={(sessionId) =>
                setViewState({ view: "arena", sessionId })
              }
            />
          ) : (
            <SavedSessions
              workspaceId={workspace.id}
              onSelect={(sessionId) =>
                setViewState({ view: "outputs", sessionId })
              }
            />
          )}
        </>
      )}

      {/* Arena view */}
      {viewState.view === "arena" && (
        <CopywritingArena
          sessionId={viewState.sessionId}
          workspaceId={workspace.id}
          onComplete={() =>
            setViewState({ view: "outputs", sessionId: viewState.sessionId })
          }
        />
      )}

      {/* Outputs view */}
      {viewState.view === "outputs" && (
        <OutputsDashboard sessionId={viewState.sessionId} />
      )}
    </div>
  );
}
