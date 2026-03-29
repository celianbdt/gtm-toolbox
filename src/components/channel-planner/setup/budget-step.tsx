"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BudgetInfo, BudgetAllocationEntry } from "@/lib/channel-planner/types";

const CURRENCIES = ["USD", "EUR", "GBP"];

type Props = {
  budget: BudgetInfo;
  onChange: (budget: BudgetInfo) => void;
};

export function BudgetStep({ budget, onChange }: Props) {
  function addAllocation() {
    onChange({
      ...budget,
      current_allocation: [
        ...budget.current_allocation,
        { channel: "", spend: 0 },
      ],
    });
  }

  function removeAllocation(index: number) {
    onChange({
      ...budget,
      current_allocation: budget.current_allocation.filter(
        (_, i) => i !== index
      ),
    });
  }

  function updateAllocation(
    index: number,
    updates: Partial<BudgetAllocationEntry>
  ) {
    onChange({
      ...budget,
      current_allocation: budget.current_allocation.map((a, i) =>
        i === index ? { ...a, ...updates } : a
      ),
    });
  }

  const totalAllocated = budget.current_allocation.reduce(
    (sum, a) => sum + (a.spend || 0),
    0
  );
  const remaining = budget.total_monthly - totalAllocated;

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Budget
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Set your total monthly budget and current channel allocation.
      </p>

      <div className="space-y-5">
        {/* Total monthly budget */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground block mb-2">
              Total monthly budget
            </label>
            <input
              type="number"
              placeholder="10000"
              value={budget.total_monthly || ""}
              onChange={(e) =>
                onChange({
                  ...budget,
                  total_monthly: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
            />
          </div>
          <div className="w-24">
            <label className="text-sm text-muted-foreground block mb-2">
              Currency
            </label>
            <select
              value={budget.currency}
              onChange={(e) =>
                onChange({ ...budget, currency: e.target.value })
              }
              className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current allocation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted-foreground">
              Current allocation (optional)
            </label>
            {budget.total_monthly > 0 && budget.current_allocation.length > 0 && (
              <span
                className={`text-xs ${
                  remaining < 0
                    ? "text-red-400"
                    : remaining === 0
                    ? "text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {remaining >= 0
                  ? `$${remaining.toLocaleString()} unallocated`
                  : `$${Math.abs(remaining).toLocaleString()} over budget`}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {budget.current_allocation.map((alloc, i) => {
              const pct =
                budget.total_monthly > 0
                  ? ((alloc.spend / budget.total_monthly) * 100).toFixed(0)
                  : "0";
              return (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Channel name"
                    value={alloc.channel}
                    onChange={(e) =>
                      updateAllocation(i, { channel: e.target.value })
                    }
                    className="flex-1 bg-secondary/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={alloc.spend || ""}
                      onChange={(e) =>
                        updateAllocation(i, {
                          spend: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-secondary/30 rounded-lg pl-6 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {pct}%
                  </span>
                  <button
                    onClick={() => removeAllocation(i)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={addAllocation}
            className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-[#7C3AED]/30 transition-colors w-full justify-center"
          >
            <Plus className="size-4" />
            Add channel allocation
          </button>
        </div>
      </div>
    </div>
  );
}
