"use client";

import { useState } from "react";
import { Send, Pause, Square } from "lucide-react";

type Props = {
  onSend: (message: string) => void;
  onPause: () => void;
  onStop: () => void;
  isRunning: boolean;
};

export function SteeringInput({ onSend, onPause, onStop, isRunning }: Props) {
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <div className="shrink-0 px-6 py-3 border-t border-border bg-background">
      <div className="max-w-3xl mx-auto flex items-center gap-2">
        <input
          type="text"
          placeholder="Steer the analysis..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 text-sm bg-secondary/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2 bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-30 text-foreground rounded-lg transition-colors"
          title="Send"
        >
          <Send className="size-4" />
        </button>
        {isRunning && (
          <>
            <button
              onClick={onPause}
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
              title="Pause"
            >
              <Pause className="size-4" />
            </button>
            <button
              onClick={onStop}
              className="p-2 text-red-400/70 hover:text-red-400 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
              title="Stop & Save"
            >
              <Square className="size-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
