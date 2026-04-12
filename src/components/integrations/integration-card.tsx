"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Unplug } from "lucide-react";
import { ProviderIcon } from "./provider-icon";
import { SyncStatusBadge } from "./sync-status-badge";
import { ConnectDialog } from "./connect-dialog";
import type {
  Integration,
  IntegrationProvider,
} from "@/lib/integrations/types";
import { PROVIDER_META } from "@/lib/integrations/types";

type IntegrationCardProps = {
  provider: IntegrationProvider;
  integration: Integration | null;
  workspaceId: string;
  onRefresh: () => void;
};

export function IntegrationCard({
  provider,
  integration,
  workspaceId,
  onRefresh,
}: IntegrationCardProps) {
  const [connectOpen, setConnectOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const meta = PROVIDER_META[provider];
  const status = syncing ? "syncing" : integration?.status ?? "disconnected";

  async function handleSync() {
    if (!integration) return;
    setSyncing(true);
    try {
      await fetch(`/api/integrations/${integration.id}/sync`, {
        method: "POST",
      });
    } catch {
      // silently fail, refresh will show actual status
    } finally {
      setSyncing(false);
      onRefresh();
    }
  }

  async function handleDisconnect() {
    if (!integration) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/integrations/${integration.id}`, {
        method: "DELETE",
      });
      onRefresh();
    } catch {
      // silently fail
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = status === "connected" || status === "syncing";
  const isError = status === "error";

  return (
    <>
      <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardContent className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                <ProviderIcon icon={meta.icon} className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">{meta.label}</h3>
                <p className="text-xs text-zinc-500">{meta.description}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <SyncStatusBadge
            status={status}
            lastSyncAt={integration?.last_sync_at ?? null}
          />

          {/* Error message */}
          {isError && integration?.error_message && (
            <p className="text-xs text-red-400/80 bg-red-500/10 rounded-md px-3 py-2">
              {integration.error_message}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-xs"
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Sync
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-xs text-zinc-500 hover:text-red-400"
                >
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                  {disconnecting ? "..." : "Déconnecter"}
                </Button>
              </>
            )}

            {!isConnected && !isError && (
              <Button
                size="sm"
                onClick={() => setConnectOpen(true)}
                className="text-xs"
              >
                Connecter
              </Button>
            )}

            {isError && (
              <Button
                size="sm"
                onClick={() => setConnectOpen(true)}
                className="text-xs"
              >
                Réessayer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConnectDialog
        provider={provider}
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={onRefresh}
        workspaceId={workspaceId}
      />
    </>
  );
}
