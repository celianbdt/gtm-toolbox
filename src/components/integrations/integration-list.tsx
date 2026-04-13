"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { IntegrationCard } from "./integration-card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Integration,
  IntegrationProvider,
} from "@/lib/integrations/types";
import { PROVIDER_META, COMING_SOON_PROVIDERS } from "@/lib/integrations/types";

const ALL_PROVIDERS = Object.keys(PROVIDER_META) as IntegrationProvider[];

export function IntegrationList() {
  const workspace = useWorkspace();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/integrations?workspace_id=${workspace.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations ?? data ?? []);
      }
    } catch {
      // fail silently, cards will show disconnected state
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  function getIntegration(provider: IntegrationProvider): Integration | null {
    return (
      integrations.find((i) => i.provider === provider) ?? null
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_PROVIDERS.map((p) => (
          <Skeleton key={p} className="h-48 rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ALL_PROVIDERS.map((provider) => (
        <IntegrationCard
          key={provider}
          provider={provider}
          integration={getIntegration(provider)}
          workspaceId={workspace.id}
          onRefresh={fetchIntegrations}
          comingSoon={COMING_SOON_PROVIDERS.has(provider)}
        />
      ))}
    </div>
  );
}
