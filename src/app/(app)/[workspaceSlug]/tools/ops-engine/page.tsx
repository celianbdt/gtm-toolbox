"use client";

import { useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { OpsHome } from "@/components/ops-engine/home/ops-home";
import { OpsGrid } from "@/components/ops-engine/grid/ops-grid";
import { ScoringConfigPanel } from "@/components/ops-engine/scoring/scoring-config";
import { CostDashboard } from "@/components/ops-engine/cost/cost-dashboard";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

type ViewState =
  | { view: "home" }
  | { view: "table"; tableId: string }
  | { view: "table-config"; tableId: string }
  | { view: "cost" };

export default function OpsEnginePage() {
  const workspace = useWorkspace();
  const [state, setState] = useState<ViewState>({ view: "home" });

  if (state.view === "cost") {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CostDashboard onBack={() => setState({ view: "home" })} />
      </div>
    );
  }

  if (state.view === "home") {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <OpsHome
          workspaceId={workspace.id}
          onNavigateTable={(tableId) => setState({ view: "table", tableId })}
          onNavigateCost={() => setState({ view: "cost" })}
        />
      </div>
    );
  }

  if (state.view === "table") {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <OpsGrid
          tableId={state.tableId}
          onBack={() => setState({ view: "home" })}
          onOpenConfig={() =>
            setState({ view: "table-config", tableId: state.tableId })
          }
        />
      </div>
    );
  }

  // table-config view
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setState({ view: "table", tableId: state.tableId })
          }
        >
          <ChevronLeft className="size-4" />
          Back to table
        </Button>
        <h2 className="text-sm font-medium">Scoring Configuration</h2>
      </div>
      <ScoringConfigPanel tableId={state.tableId} />
    </div>
  );
}
