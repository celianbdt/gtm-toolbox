"use client";

type Props = {
  mission: string;
  onChange: (v: string) => void;
  maxTurns: number;
  onMaxTurnsChange: (n: number) => void;
};

export function MissionInput({ mission, onChange, maxTurns, onMaxTurnsChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Define the debate mission</h2>
        <p className="text-sm text-muted-foreground mt-1">
          What strategic question should the team debate? Be specific for better results.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Mission / Question</label>
        <textarea
          value={mission}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. What is the best ICP for our B2B SaaS product targeting mid-market companies?"
          rows={4}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">Max turns</label>
          <span className="text-sm font-medium text-foreground">{maxTurns}</span>
        </div>
        <input
          type="range"
          min={3}
          max={20}
          step={1}
          value={maxTurns}
          onChange={(e) => onMaxTurnsChange(Number(e.target.value))}
          className="w-full accent-amber-700"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>3 (focused)</span>
          <span>20 (deep dive)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          A turn = one message from you + all agent responses. Debate stops after {maxTurns} turns or
          when you end it.
        </p>
      </div>
    </div>
  );
}
