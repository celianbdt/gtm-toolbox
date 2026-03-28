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
        <h2 className="text-lg font-semibold text-white">Define the debate mission</h2>
        <p className="text-sm text-zinc-400 mt-1">
          What strategic question should the team debate? Be specific for better results.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-zinc-400">Mission / Question</label>
        <textarea
          value={mission}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. What is the best ICP for our B2B SaaS product targeting mid-market companies?"
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-zinc-400">Max turns</label>
          <span className="text-sm font-medium text-white">{maxTurns}</span>
        </div>
        <input
          type="range"
          min={3}
          max={20}
          step={1}
          value={maxTurns}
          onChange={(e) => onMaxTurnsChange(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>3 (focused)</span>
          <span>20 (deep dive)</span>
        </div>
        <p className="text-xs text-zinc-500">
          A turn = one message from you + all agent responses. Debate stops after {maxTurns} turns or
          when you end it.
        </p>
      </div>
    </div>
  );
}
