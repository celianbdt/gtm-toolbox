"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, CheckCircle2 } from "lucide-react";
import type { CWSessionOutput, SequenceOutput, SequenceStep } from "@/lib/copywriting/types";
import { CHANNEL_LABELS } from "@/lib/copywriting/types";

type Props = {
  sessionId: string;
};

export function OutputsDashboard({ sessionId }: Props) {
  const [outputs, setOutputs] = useState<CWSessionOutput[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOutputs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/copywriting/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setOutputs(data.outputs ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchOutputs();
  }, [fetchOutputs]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const sequenceOutput = outputs.find((o) => o.output_type === "sequence");
  const debateOutput = outputs.find((o) => o.output_type === "debate-summary");
  const sequence = sequenceOutput?.metadata as SequenceOutput | undefined;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Debate summary */}
      {debateOutput && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Synthese du debat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {debateOutput.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sequence */}
      {sequence && (
        <>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              Sequence {CHANNEL_LABELS[sequence.channel]}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {sequence.steps.length} messages
            </Badge>
          </div>

          <div className="space-y-3">
            {sequence.steps.map((step, i) => (
              <SequenceStepCard key={i} step={step} index={i} channel={sequence.channel} />
            ))}
          </div>
        </>
      )}

      {!sequence && !loading && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Aucune sequence generee pour cette session.
        </div>
      )}
    </div>
  );
}

function SequenceStepCard({
  step,
  index,
  channel,
}: {
  step: SequenceStep;
  index: number;
  channel: string;
}) {
  const [copied, setCopied] = useState(false);

  const fullText = [step.subject ? `Sujet: ${step.subject}` : null, step.body, step.cta ? `CTA: ${step.cta}` : null]
    .filter(Boolean)
    .join("\n\n");

  async function handleCopy() {
    await navigator.clipboard.writeText(step.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const stepLabel =
    index === 0
      ? channel === "cold-calling"
        ? "Script principal"
        : "Message initial"
      : `Follow-up ${index}`;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Step {step.step_number}
            </Badge>
            <span className="text-xs text-muted-foreground">{stepLabel}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1">
            {copied ? (
              <>
                <CheckCircle2 className="size-3 text-emerald-500" />
                Copie
              </>
            ) : (
              <>
                <Copy className="size-3" />
                Copier
              </>
            )}
          </Button>
        </div>

        {step.subject && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Sujet
            </span>
            <p className="text-sm font-medium">{step.subject}</p>
          </div>
        )}

        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Message
          </span>
          <p className="text-sm whitespace-pre-wrap mt-1">{step.body}</p>
        </div>

        {step.cta && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              CTA
            </span>
            <p className="text-sm text-violet-400">{step.cta}</p>
          </div>
        )}

        {step.notes && (
          <div className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2">
            <span className="text-[10px] uppercase tracking-wider text-amber-400">
              Notes / Objections
            </span>
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {step.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
