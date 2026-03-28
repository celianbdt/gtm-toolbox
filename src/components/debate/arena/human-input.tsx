"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Pause, Square } from "lucide-react";

type Props = {
  onSend: (message: string) => void;
  onPause: () => void;
  onStop: () => void;
  isStreaming: boolean;
  currentTurn: number;
  maxTurns: number;
};

export function HumanInput({ onSend, onPause, onStop, isStreaming, currentTurn, maxTurns }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isMaxReached = currentTurn >= maxTurns;
  const placeholder =
    isMaxReached
      ? "Max turns reached — debate concluded."
      : isStreaming
      ? "Steer the debate..."
      : currentTurn === 0
      ? "Start the debate with your first message..."
      : "Interject or ask a follow-up... (Enter to send)";

  return (
    <div className="shrink-0 px-6 py-3 border-t border-border bg-background">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 bg-secondary/30 rounded-xl border border-border focus-within:border-[#7C3AED]/30 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isMaxReached}
            rows={1}
            className="w-full bg-transparent px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!value.trim() || isMaxReached}
          className="p-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-30 text-white rounded-xl transition-colors"
          title="Send"
        >
          <Send className="size-4" />
        </button>

        {isStreaming && (
          <>
            <button
              onClick={onPause}
              className="p-2.5 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-colors"
              title="Pause"
            >
              <Pause className="size-4" />
            </button>
            <button
              onClick={onStop}
              className="p-2.5 text-red-400/70 hover:text-red-400 bg-secondary/50 hover:bg-secondary rounded-xl transition-colors"
              title="Stop"
            >
              <Square className="size-4" />
            </button>
          </>
        )}

        {!isStreaming && (
          <span className="text-[10px] text-muted-foreground self-center whitespace-nowrap">
            {currentTurn}/{maxTurns}
          </span>
        )}
      </div>
    </div>
  );
}
