"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Hash, Lock } from "lucide-react";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { PROVIDER_META } from "@/lib/integrations/types";

const CREDENTIAL_CONFIG: Record<
  IntegrationProvider,
  { field: string; placeholder: string; helpText: string; credKey: string }
> = {
  hubspot: {
    field: "API Key ou Access Token",
    placeholder: "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    helpText: "Créez un Private App dans HubSpot > Settings > Integrations > Private Apps.",
    credKey: "access_token",
  },
  pipedrive: {
    field: "API Token",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Trouvez votre token dans Pipedrive > Settings > Personal preferences > API.",
    credKey: "api_key",
  },
  attio: {
    field: "API Key",
    placeholder: "attio_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Générez une clé API dans Attio > Settings > Developers.",
    credKey: "api_key",
  },
  folk: {
    field: "API Key",
    placeholder: "folk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Trouvez votre clé API dans Folk > Settings > API.",
    credKey: "api_key",
  },
  notion: {
    field: "Integration Token",
    placeholder: "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Créez une intégration sur notion.so/my-integrations puis partagez les pages concernées.",
    credKey: "access_token",
  },
  slack: {
    field: "Bot Token",
    placeholder: "xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Créez une app sur api.slack.com/apps, ajoutez les scopes channels:read, channels:history, chat:write, puis installez dans votre workspace Slack.",
    credKey: "access_token",
  },
  lemlist: {
    field: "API Key",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Trouvez votre clé API dans Lemlist > Settings > Integrations > API.",
    credKey: "api_key",
  },
  instantly: {
    field: "API Key",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Trouvez votre clé API dans Instantly > Settings > API > API Key.",
    credKey: "api_key",
  },
  smartlead: {
    field: "API Key",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Trouvez votre clé API dans SmartLead > Settings > API.",
    credKey: "api_key",
  },
  plusvibe: {
    field: "API Key",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Trouvez votre clé API dans PlusVibe > Settings > API Access (Business Plan requis).",
    credKey: "api_key",
  },
  clay: {
    field: "API Key",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Entrez votre clé API Clay (Enterprise) ou un identifiant webhook.",
    credKey: "api_key",
  },
};

type SlackChannelInfo = {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
  topic: string;
};

type ConnectDialogProps = {
  provider: IntegrationProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
  workspaceId: string;
  existingConfig?: Record<string, unknown>;
};

export function ConnectDialog({
  provider,
  open,
  onOpenChange,
  onConnected,
  workspaceId,
  existingConfig,
}: ConnectDialogProps) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "channels">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Slack channel selection
  const [channels, setChannels] = useState<SlackChannelInfo[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    new Set((existingConfig?.channel_ids as string[]) ?? [])
  );
  const [channelSearch, setChannelSearch] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(false);

  const meta = PROVIDER_META[provider];
  const config = CREDENTIAL_CONFIG[provider];

  // If Slack is already connected and we reopen, go straight to channel selector
  useEffect(() => {
    if (open && provider === "slack" && existingConfig?.connected) {
      setStatus("channels");
      fetchChannels();
    }
  }, [open, provider, existingConfig?.connected]);

  async function fetchChannels() {
    setLoadingChannels(true);
    try {
      const res = await fetch(`/api/integrations/slack/channels?workspace_id=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingChannels(false);
    }
  }

  async function handleConnect() {
    if (!token.trim()) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          provider,
          credentials: { [config.credKey]: token.trim() },
        }),
      });

      if (res.ok) {
        if (provider === "slack") {
          setStatus("channels");
          fetchChannels();
        } else {
          setStatus("success");
          setTimeout(() => {
            resetAndClose();
            onConnected();
          }, 800);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "La connexion a échoué. Vérifiez vos identifiants.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Erreur réseau. Réessayez.");
      setStatus("error");
    }
  }

  function toggleChannel(channelId: string) {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  }

  async function handleSaveChannels() {
    setLoadingChannels(true);
    try {
      // Find the integration ID first
      const listRes = await fetch(`/api/integrations?workspace_id=${workspaceId}`);
      if (!listRes.ok) throw new Error("Failed to fetch integrations");
      const listData = await listRes.json();
      const slackIntegration = (listData.integrations ?? []).find(
        (i: { provider: string }) => i.provider === "slack"
      );
      if (!slackIntegration) throw new Error("Slack integration not found");

      // Update config with selected channels
      await fetch(`/api/integrations/${slackIntegration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { channel_ids: Array.from(selectedChannels) },
        }),
      });

      resetAndClose();
      onConnected();
    } catch {
      setErrorMsg("Erreur lors de la sauvegarde des channels.");
    } finally {
      setLoadingChannels(false);
    }
  }

  function resetAndClose() {
    setToken("");
    setStatus("idle");
    setErrorMsg("");
    setChannelSearch("");
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetAndClose();
    else onOpenChange(next);
  }

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {status === "channels"
              ? `${meta.label} — Sélectionner les channels`
              : `Connecter ${meta.label}`}
          </DialogTitle>
          <DialogDescription>
            {status === "channels"
              ? "Choisissez les channels Slack à synchroniser pour ce workspace."
              : meta.description}
          </DialogDescription>
        </DialogHeader>

        {status === "channels" ? (
          /* ── Channel selector ── */
          <div className="space-y-3">
            <Input
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Rechercher un channel..."
              className="h-8 text-xs"
            />

            <div className="max-h-64 overflow-y-auto space-y-0.5 rounded-md border border-zinc-800 p-1">
              {loadingChannels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : filteredChannels.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucun channel trouvé
                </p>
              ) : (
                filteredChannels.map((c) => {
                  const isSelected = selectedChannels.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleChannel(c.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                        isSelected
                          ? "bg-violet-500/10 ring-1 ring-violet-500/30"
                          : "hover:bg-zinc-800"
                      }`}
                    >
                      {c.is_private ? (
                        <Lock className="size-3 text-muted-foreground shrink-0" />
                      ) : (
                        <Hash className="size-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-medium truncate flex-1">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {c.num_members} members
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="size-3 text-violet-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {selectedChannels.size > 0 && (
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedChannels).map((id) => {
                  const ch = channels.find((c) => c.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="text-[10px] cursor-pointer hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => toggleChannel(id)}
                    >
                      #{ch?.name ?? id} ×
                    </Badge>
                  );
                })}
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          /* ── Token input ── */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">{config.field}</label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={config.placeholder}
                className="font-mono text-xs"
                disabled={status === "loading" || status === "success"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConnect();
                }}
              />
              <p className="text-xs text-zinc-500">{config.helpText}</p>
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {status === "success" && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Connexion réussie !</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={status === "loading" || loadingChannels}
          >
            {status === "channels" ? "Fermer" : "Annuler"}
          </Button>

          {status === "channels" ? (
            <Button
              onClick={handleSaveChannels}
              disabled={selectedChannels.size === 0 || loadingChannels}
            >
              {loadingChannels && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sauvegarder ({selectedChannels.size} channel{selectedChannels.size > 1 ? "s" : ""})
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={!token.trim() || status === "loading" || status === "success"}
            >
              {status === "loading" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {status === "loading" ? "Test en cours..." : "Tester & Connecter"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
