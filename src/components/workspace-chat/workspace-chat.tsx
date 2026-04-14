"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, Bot, User } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  workspaceId: string;
  workspaceName: string;
};

export function WorkspaceChat({ workspaceId, workspaceName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/workspace-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages([...newMessages, { role: "assistant", content: "Erreur lors de la generation." }]);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: accumulated }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Erreur de connexion." }]);
    } finally {
      setStreaming(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="size-10 text-violet-400 mb-4" />
            <h3 className="text-sm font-medium mb-1">Assistant GTM — {workspaceName}</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Pose des questions sur ton workspace : contexte, taches, metriques, integrations, insights des sessions precedentes.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 max-w-lg justify-center">
              {[
                "Resume l'etat de ce workspace",
                "Quelles taches sont bloquees ?",
                "Que disent les insights de l'ICP Audit ?",
                "Quels sont les next steps prioritaires ?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-border hover:border-violet-500/30 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                <Bot className="size-4 text-violet-400" />
              </div>
            )}
            <Card className={`max-w-[80%] ${msg.role === "user" ? "bg-violet-500/10 border-violet-500/20" : ""}`}>
              <CardContent className="py-2 px-3">
                <div className="text-sm whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                    <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5" />
                  )}
                </div>
              </CardContent>
            </Card>
            {msg.role === "user" && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-border">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pose une question sur ton workspace..."
          rows={1}
          className="resize-none min-h-[40px] text-sm"
          disabled={streaming}
        />
        <Button type="submit" size="sm" disabled={streaming || !input.trim()} className="shrink-0 h-10 w-10 p-0">
          {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
