"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Key } from "lucide-react";

type Props = {
  workspaceSlug: string;
  initialKeys: {
    anthropic_api_key?: string;
    openai_api_key?: string;
  };
};

function maskKey(key?: string): string {
  if (!key) return "";
  if (key.length <= 12) return "••••••••";
  return key.slice(0, 8) + "••••••••" + key.slice(-4);
}

export function APIKeysForm({ workspaceSlug, initialKeys }: Props) {
  const [anthropicKey, setAnthropicKey] = useState(initialKeys.anthropic_api_key ?? "");
  const [openaiKey, setOpenaiKey] = useState(initialKeys.openai_api_key ?? "");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch(`/api/workspaces/${workspaceSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_keys: {
          anthropic_api_key: anthropicKey.trim() || undefined,
          openai_api_key: openaiKey.trim() || undefined,
        },
      }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
    setSaving(false);
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-4 w-4 text-amber-400" />
        <h2 className="text-base font-semibold text-foreground">Clés API</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Chaque workspace utilise ses propres clés API pour les appels IA. Si vide, les clés globales du serveur sont utilisées.
      </p>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Anthropic (Claude)</label>
          <div className="relative">
            <Input
              type={showAnthropic ? "text" : "password"}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowAnthropic(!showAnthropic)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">OpenAI (GPT)</label>
          <div className="relative">
            <Input
              type={showOpenai ? "text" : "password"}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowOpenai(!showOpenai)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={saving}>
          {saved ? "Sauvegardé ✓" : saving ? "Sauvegarde..." : "Sauvegarder les clés"}
        </Button>
      </form>
    </section>
  );
}
