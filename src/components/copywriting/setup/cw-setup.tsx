"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Mail, Phone, Zap, Brain } from "lucide-react";
import { CostEstimateBadge } from "@/components/ui/cost-estimate-badge";
import { estimateToolCost } from "@/lib/ai/cost-estimator";
import {
  type CopywritingChannel,
  type CopywritingTone,
  type CopywritingMode,
  CHANNEL_LABELS,
  CHANNEL_DESCRIPTIONS,
  TONE_LABELS,
  MODE_LABELS,
} from "@/lib/copywriting/types";

type Props = {
  workspaceId: string;
  onSessionCreated: (sessionId: string) => void;
};

const CHANNEL_ICONS: Record<CopywritingChannel, React.ReactNode> = {
  linkedin: <MessageCircle className="size-5" />,
  "cold-email": <Mail className="size-5" />,
  "cold-calling": <Phone className="size-5" />,
};

const MODE_ICONS: Record<CopywritingMode, React.ReactNode> = {
  quick: <Zap className="size-4" />,
  deep: <Brain className="size-4" />,
};

export function CWSetup({ workspaceId, onSessionCreated }: Props) {
  const [channel, setChannel] = useState<CopywritingChannel>("cold-email");
  const [tone, setTone] = useState<CopywritingTone>("professional");
  const [mode, setMode] = useState<CopywritingMode>("quick");
  const [sequenceLength, setSequenceLength] = useState(3);
  const [brief, setBrief] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!brief.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/copywriting/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          channel,
          tone,
          mode,
          sequence_length: sequenceLength,
          brief: brief.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSessionCreated(data.session.id);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Channel */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Canal</label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(CHANNEL_LABELS) as CopywritingChannel[]).map((ch) => (
            <Card
              key={ch}
              className={`cursor-pointer transition-all ${
                channel === ch
                  ? "border-violet-500 bg-violet-500/5"
                  : "hover:border-border/80"
              }`}
              onClick={() => setChannel(ch)}
            >
              <CardContent className="flex flex-col items-center gap-2 py-4">
                <div className={channel === ch ? "text-violet-400" : "text-muted-foreground"}>
                  {CHANNEL_ICONS[ch]}
                </div>
                <span className="text-sm font-medium">{CHANNEL_LABELS[ch]}</span>
                <span className="text-[10px] text-muted-foreground text-center">
                  {CHANNEL_DESCRIPTIONS[ch]}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sequence length */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Nombre de messages : {sequenceLength}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setSequenceLength(n)}
              className={`size-9 rounded-lg text-sm font-medium transition-all ${
                sequenceLength === n
                  ? "bg-violet-500 text-white"
                  : "bg-card border border-border hover:border-violet-500/30"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Ton</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TONE_LABELS) as CopywritingTone[]).map((t) => (
            <Badge
              key={t}
              variant={tone === t ? "default" : "secondary"}
              className={`cursor-pointer text-xs px-3 py-1 ${
                tone === t ? "bg-violet-500" : "hover:bg-accent"
              }`}
              onClick={() => setTone(t)}
            >
              {TONE_LABELS[t]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Mode</label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(MODE_LABELS) as CopywritingMode[]).map((m) => (
            <Card
              key={m}
              className={`cursor-pointer transition-all ${
                mode === m
                  ? "border-violet-500 bg-violet-500/5"
                  : "hover:border-border/80"
              }`}
              onClick={() => setMode(m)}
            >
              <CardContent className="flex items-center gap-3 py-3">
                <div className={mode === m ? "text-violet-400" : "text-muted-foreground"}>
                  {MODE_ICONS[m]}
                </div>
                <span className="text-sm">{MODE_LABELS[m]}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Brief */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Brief</label>
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Decris ta cible, ton offre, et l'objectif de la sequence. Le contexte du workspace (ICP, produit) sera charge automatiquement."
          rows={4}
        />
        <p className="text-[11px] text-muted-foreground">
          Le contexte de ton workspace (documents ICP, produit, competiteurs) sera injecte automatiquement.
        </p>
      </div>

      {/* Cost estimate + Submit */}
      <div className="flex items-center gap-3">
        <CostEstimateBadge estimate={estimateToolCost("copywriting")} />
        <Button
          onClick={handleCreate}
          disabled={creating || !brief.trim()}
          className="flex-1"
        >
          {creating ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : null}
          {creating ? "Creation..." : "Lancer la generation"}
        </Button>
      </div>
    </div>
  );
}
