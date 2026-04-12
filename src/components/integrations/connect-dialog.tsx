"use client";

import { useState } from "react";
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
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { PROVIDER_META } from "@/lib/integrations/types";

const CREDENTIAL_CONFIG: Record<
  IntegrationProvider,
  { field: string; placeholder: string; helpText: string }
> = {
  hubspot: {
    field: "API Key ou Access Token",
    placeholder: "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    helpText:
      "Cr\u00e9ez un Private App dans HubSpot > Settings > Integrations > Private Apps.",
  },
  pipedrive: {
    field: "API Token",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText:
      "Trouvez votre token dans Pipedrive > Settings > Personal preferences > API.",
  },
  attio: {
    field: "API Key",
    placeholder: "attio_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "G\u00e9n\u00e9rez une cl\u00e9 API dans Attio > Settings > Developers.",
  },
  folk: {
    field: "API Key",
    placeholder: "folk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText: "Trouvez votre cl\u00e9 API dans Folk > Settings > API.",
  },
  notion: {
    field: "Integration Token",
    placeholder: "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    helpText:
      "Cr\u00e9ez une int\u00e9gration sur notion.so/my-integrations puis partagez les pages concern\u00e9es.",
  },
  slack: {
    field: "Bot Token",
    placeholder: "xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx",
    helpText:
      "Cr\u00e9ez une app sur api.slack.com/apps, activez Bot Token Scopes et installez dans votre workspace.",
  },
};

type ConnectDialogProps = {
  provider: IntegrationProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
  workspaceId: string;
};

export function ConnectDialog({
  provider,
  open,
  onOpenChange,
  onConnected,
  workspaceId,
}: ConnectDialogProps) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const meta = PROVIDER_META[provider];
  const config = CREDENTIAL_CONFIG[provider];

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
          credentials: { api_key: token.trim() },
        }),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => {
          setToken("");
          setStatus("idle");
          onOpenChange(false);
          onConnected();
        }, 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "La connexion a \u00e9chou\u00e9. V\u00e9rifiez vos identifiants.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Erreur r\u00e9seau. R\u00e9essayez.");
      setStatus("error");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setToken("");
      setStatus("idle");
      setErrorMsg("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            Connecter {meta.label}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

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
              <span>Connexion r\u00e9ussie !</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={status === "loading"}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!token.trim() || status === "loading" || status === "success"}
          >
            {status === "loading" && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {status === "loading" ? "Test en cours..." : "Tester & Connecter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
