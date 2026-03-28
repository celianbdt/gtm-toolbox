"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { OBSetup } from "@/components/outbound-builder/setup/ob-setup";
import { OutboundArena } from "@/components/outbound-builder/arena/outbound-arena";
import { OutputsDashboard } from "@/components/outbound-builder/outputs/outputs-dashboard";

type Mode = "analyzer" | "builder";

type ViewState =
  | { view: "home"; tab: Mode }
  | { view: "arena"; sessionId: string; mode: Mode }
  | { view: "outputs"; sessionId: string };

export default function OutboundBuilderPage() {
  const workspace = useWorkspace();
  const [state, setState] = useState<ViewState>({ view: "home", tab: "analyzer" });

  if (state.view === "home") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <div className="shrink-0 px-6 border-b border-border">
          <div className="flex gap-1 max-w-2xl mx-auto">
            {(["analyzer", "builder"] as Mode[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setState({ view: "home", tab })}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  state.tab === tab
                    ? "text-[#A78BFA] border-[#7C3AED]"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {tab === "analyzer" ? "Campaign Analyzer" : "Sequence Builder"}
              </button>
            ))}
          </div>
        </div>

        {/* Setup */}
        <div className="flex-1 overflow-hidden">
          <OBSetup
            workspaceId={workspace.id}
            mode={state.tab}
            onSessionCreated={(sessionId, mode) =>
              setState({ view: "arena", sessionId, mode })
            }
          />
        </div>
      </div>
    );
  }

  if (state.view === "arena") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <OutboundArena
          sessionId={state.sessionId}
          mode={state.mode}
          onComplete={() =>
            setState({ view: "outputs", sessionId: state.sessionId })
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <OutputsDashboard
        sessionId={state.sessionId}
        onBack={() => setState({ view: "home", tab: "analyzer" })}
      />
    </div>
  );
}
