"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CurrentMessaging } from "@/lib/messaging-lab/types";

type Props = {
  currentMessaging: CurrentMessaging;
  onChange: (messaging: CurrentMessaging) => void;
};

export function CurrentMessagingStep({ currentMessaging, onChange }: Props) {
  const [vpInput, setVpInput] = useState("");

  function addValueProp() {
    if (!vpInput.trim()) return;
    onChange({ ...currentMessaging, value_props: [...currentMessaging.value_props, vpInput.trim()] });
    setVpInput("");
  }

  function removeValueProp(index: number) {
    onChange({ ...currentMessaging, value_props: currentMessaging.value_props.filter((_, i) => i !== index) });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Current Messaging
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Share your existing messaging so the team can build on or improve it.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Current tagline (optional)</label>
          <input
            type="text"
            placeholder='e.g. "The platform for modern teams"'
            value={currentMessaging.tagline ?? ""}
            onChange={(e) => onChange({ ...currentMessaging, tagline: e.target.value || undefined })}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
          />
        </div>

        {/* Value Props */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Current value propositions</label>
          {currentMessaging.value_props.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {currentMessaging.value_props.map((vp, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-2.5 py-1.5"
                >
                  <span className="flex-1 text-foreground">{vp}</span>
                  <button
                    onClick={() => removeValueProp(i)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a value proposition..."
              value={vpInput}
              onChange={(e) => setVpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addValueProp()}
              className="flex-1 text-sm bg-secondary/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
            />
            <button
              onClick={addValueProp}
              disabled={!vpInput.trim()}
              className="px-3 py-2 text-sm bg-secondary hover:bg-accent text-foreground rounded-lg disabled:opacity-40 transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Elevator pitch (optional)</label>
          <textarea
            placeholder="How do you currently pitch your product in 30 seconds?"
            value={currentMessaging.elevator_pitch ?? ""}
            onChange={(e) => onChange({ ...currentMessaging, elevator_pitch: e.target.value || undefined })}
            rows={3}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30 resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">What do you want to improve?</label>
          <textarea
            placeholder="What's not working in your current messaging? What feels off?"
            value={currentMessaging.what_to_improve ?? ""}
            onChange={(e) => onChange({ ...currentMessaging, what_to_improve: e.target.value || undefined })}
            rows={3}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
