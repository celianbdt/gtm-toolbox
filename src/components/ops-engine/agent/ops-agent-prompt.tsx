"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Clock, Sparkles } from "lucide-react";

const QUICK_PROMPTS = [
  "Find French SaaS companies that raised Series A in the last 6 months",
  "Track companies hiring VP Sales in Europe",
  "Monitor fintech startups using Stripe from Crunchbase",
  "Build a list of AI startups in Paris with 10-50 employees",
  "Find companies that visited our website and enrich their contacts",
];

const STORAGE_KEY = "ops-agent-prompt-history";

type Props = {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
};

export function OpsAgentPrompt({ onSubmit, isLoading }: Props) {
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    // Save to history
    const updated = [trimmed, ...history.filter((h) => h !== trimmed)].slice(
      0,
      10
    );
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }

    onSubmit(trimmed);
    setPrompt("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-4">
      {/* Main input */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you're looking for... e.g., 'Find French SaaS companies that raised Series A and enrich their contacts'"
          className="min-h-[120px] resize-none pr-14 text-base"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="absolute right-3 bottom-3"
          onClick={handleSubmit}
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2">
        <Sparkles className="size-4 text-muted-foreground mt-0.5" />
        {QUICK_PROMPTS.map((qp) => (
          <Badge
            key={qp}
            variant="outline"
            className="cursor-pointer hover:bg-muted transition-colors text-xs"
            onClick={() => {
              if (!isLoading) {
                setPrompt(qp);
                textareaRef.current?.focus();
              }
            }}
          >
            {qp}
          </Badge>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock className="size-3" />
            {showHistory ? "Hide" : "Show"} recent prompts ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1">
              {history.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  className="block w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded px-2 py-1 transition-colors truncate"
                  onClick={() => {
                    if (!isLoading) {
                      setPrompt(h);
                      textareaRef.current?.focus();
                    }
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">Cmd+Enter</kbd> to submit
      </p>
    </div>
  );
}
