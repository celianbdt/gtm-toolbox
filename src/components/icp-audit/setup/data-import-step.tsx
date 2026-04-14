"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Upload, FileText, Trophy, XCircle } from "lucide-react";
import type { CustomerDataSource, WinLossEntry } from "@/lib/icp-audit/types";
import Papa from "papaparse";

type Props = {
  customerData: CustomerDataSource[];
  onCustomerDataChange: (data: CustomerDataSource[]) => void;
  winLossData: WinLossEntry[];
  onWinLossDataChange: (data: WinLossEntry[]) => void;
};

export function DataImportStep({
  customerData,
  onCustomerDataChange,
  winLossData,
  onWinLossDataChange,
}: Props) {
  const [manualInput, setManualInput] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const content = JSON.stringify(results.data, null, 2);
        onCustomerDataChange([
          ...customerData,
          {
            type: "csv",
            title: file.name,
            content,
          },
        ]);
      },
      error: () => {
        // silently fail
      },
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addManualData() {
    if (!manualInput.trim()) return;
    onCustomerDataChange([
      ...customerData,
      {
        type: "manual",
        title: manualTitle.trim() || "Manual data",
        content: manualInput.trim(),
      },
    ]);
    setManualInput("");
    setManualTitle("");
  }

  function removeSource(index: number) {
    onCustomerDataChange(customerData.filter((_, i) => i !== index));
  }

  function addWinLossEntry(type: "win" | "loss") {
    onWinLossDataChange([
      ...winLossData,
      {
        type,
        account_name: "",
        segment: "",
        reason: "",
        deal_size: "",
        notes: "",
      },
    ]);
  }

  function updateWinLoss(index: number, updates: Partial<WinLossEntry>) {
    onWinLossDataChange(
      winLossData.map((e, i) => (i === index ? { ...e, ...updates } : e))
    );
  }

  function removeWinLoss(index: number) {
    onWinLossDataChange(winLossData.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-8">
      {/* Customer Data */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Customer Data
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Import customer data for analysis. CSV, CRM exports, or manual input.
        </p>

        {/* Existing sources */}
        {customerData.length > 0 && (
          <div className="space-y-2 mb-4">
            {customerData.map((src, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded px-3 py-2"
              >
                <FileText className="size-3.5 shrink-0" />
                <span className="truncate flex-1 text-foreground">{src.title}</span>
                <span className="text-muted-foreground/60">{src.type}</span>
                <span className="text-muted-foreground/60">{src.content.length} chars</span>
                <button
                  onClick={() => removeSource(i)}
                  className="hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CSV Upload */}
        <div className="flex gap-2 mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-[#8a6e4e]/30 transition-colors"
          >
            <Upload className="size-4" />
            Upload CSV
          </button>
        </div>

        {/* Manual input */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Data source title (optional)"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            className="w-full text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
          />
          <textarea
            placeholder="Paste customer data, CRM export, or notes here..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            rows={4}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30 resize-none"
          />
          <button
            onClick={addManualData}
            disabled={!manualInput.trim()}
            className="text-xs px-3 py-1.5 bg-secondary hover:bg-accent text-foreground rounded disabled:opacity-40 transition-colors"
          >
            Add data source
          </button>
        </div>
      </div>

      {/* Win/Loss Data */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Win/Loss Data
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add win and loss entries for pattern analysis.
        </p>

        <div className="space-y-2">
          {winLossData.map((entry, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                {entry.type === "win" ? (
                  <Trophy className="size-3.5 text-green-400" />
                ) : (
                  <XCircle className="size-3.5 text-red-400" />
                )}
                <span className={`text-xs font-medium ${entry.type === "win" ? "text-green-400" : "text-red-400"}`}>
                  {entry.type.toUpperCase()}
                </span>
                <button
                  onClick={() => removeWinLoss(i)}
                  className="ml-auto text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Account name"
                  value={entry.account_name ?? ""}
                  onChange={(e) => updateWinLoss(i, { account_name: e.target.value })}
                  className="text-xs bg-secondary/30 rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
                <input
                  type="text"
                  placeholder="Segment"
                  value={entry.segment ?? ""}
                  onChange={(e) => updateWinLoss(i, { segment: e.target.value })}
                  className="text-xs bg-secondary/30 rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
              </div>
              <input
                type="text"
                placeholder="Reason for win/loss *"
                value={entry.reason}
                onChange={(e) => updateWinLoss(i, { reason: e.target.value })}
                className="w-full text-xs bg-secondary/30 rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Deal size ($)"
                  value={entry.deal_size ?? ""}
                  onChange={(e) => updateWinLoss(i, { deal_size: e.target.value })}
                  className="text-xs bg-secondary/30 rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={entry.notes ?? ""}
                  onChange={(e) => updateWinLoss(i, { notes: e.target.value })}
                  className="text-xs bg-secondary/30 rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => addWinLossEntry("win")}
            className="flex items-center gap-2 px-4 py-2 text-xs text-green-400 border border-dashed border-green-400/30 rounded-lg hover:border-green-400/60 transition-colors"
          >
            <Plus className="size-3.5" />
            Add Win
          </button>
          <button
            onClick={() => addWinLossEntry("loss")}
            className="flex items-center gap-2 px-4 py-2 text-xs text-red-400 border border-dashed border-red-400/30 rounded-lg hover:border-red-400/60 transition-colors"
          >
            <Plus className="size-3.5" />
            Add Loss
          </button>
        </div>
      </div>
    </div>
  );
}
