"use client";

import { useState, useCallback } from "react";
import type { CampaignRow, CampaignDataSource, CampaignChannel } from "@/lib/outbound-builder/types";
import { parseCampaignFile } from "@/lib/outbound-builder/csv-parser";
import type { OutboundProvider } from "@/lib/outbound-builder/connectors";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/lib/outbound-builder/connectors";

type Props = {
  dataSources: CampaignDataSource[];
  onChange: (ds: CampaignDataSource[]) => void;
};

const CHANNELS: CampaignChannel[] = ["email", "linkedin", "call", "other"];
const PROVIDERS: OutboundProvider[] = ["lemlist", "instantly", "plusvibe", "smartlead"];

type InputMode = "file" | "connect" | "manual";

export function CampaignDataStep({ dataSources, onChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [manualRow, setManualRow] = useState<Partial<CampaignRow>>({
    campaign_name: "",
    channel: "email",
  });

  // Connect state
  const [selectedProvider, setSelectedProvider] = useState<OutboundProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [providerWorkspaceId, setProviderWorkspaceId] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const totalRows = dataSources.reduce((sum, ds) => sum + ds.rows.length, 0);

  const handleFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError("");
      try {
        const { rows } = await parseCampaignFile(file);
        if (rows.length === 0) {
          setError("No data found in file");
          return;
        }
        onChange([...dataSources, { type: "csv", filename: file.name, rows }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse file");
      } finally {
        setIsUploading(false);
      }
    },
    [dataSources, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!selectedProvider || !apiKey.trim()) return;
    setIsImporting(true);
    setError("");
    try {
      const res = await fetch("/api/outbound-builder/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          workspaceId: providerWorkspaceId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");

      if (data.rows.length === 0) {
        setError("No campaigns found in this account");
        return;
      }

      onChange([
        ...dataSources,
        {
          type: selectedProvider,
          filename: `${PROVIDER_LABELS[selectedProvider]} (${data.campaignCount} campaigns)`,
          rows: data.rows,
        },
      ]);
      setApiKey("");
      setProviderWorkspaceId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const addManualRow = () => {
    if (!manualRow.campaign_name?.trim()) return;
    const row: CampaignRow = {
      campaign_name: manualRow.campaign_name!,
      channel: manualRow.channel ?? "email",
      segment: manualRow.segment,
      sent: manualRow.sent,
      open_rate: manualRow.open_rate,
      reply_rate: manualRow.reply_rate,
      meetings_booked: manualRow.meetings_booked,
    };

    const existing = dataSources.find((ds) => ds.type === "manual");
    if (existing) {
      onChange(
        dataSources.map((ds) =>
          ds.type === "manual" ? { ...ds, rows: [...ds.rows, row] } : ds
        )
      );
    } else {
      onChange([...dataSources, { type: "manual", rows: [row] }]);
    }
    setManualRow({ campaign_name: "", channel: "email" });
  };

  const removeSource = (index: number) => {
    onChange(dataSources.filter((_, i) => i !== index));
  };

  const sourceLabel = (ds: CampaignDataSource) => {
    if (ds.type === "csv") return ds.filename ?? "CSV file";
    if (ds.type === "manual") return "Manual entries";
    return ds.filename ?? PROVIDER_LABELS[ds.type as OutboundProvider] ?? ds.type;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Campaign Data</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Import past campaign data from your tools, CSV, or manual entry.
      </p>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit mb-6">
        {([
          { key: "file" as const, label: "CSV / Excel" },
          { key: "connect" as const, label: "Connect Tool" },
          { key: "manual" as const, label: "Manual" },
        ]).map((m) => (
          <button
            key={m.key}
            onClick={() => { setInputMode(m.key); setError(""); }}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              inputMode === m.key
                ? "bg-[#7C3AED] text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* === FILE MODE === */}
      {inputMode === "file" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#7C3AED]/50 transition-colors cursor-pointer"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv,.xlsx,.xls";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          {isUploading ? (
            <p className="text-sm text-muted-foreground">Parsing file...</p>
          ) : (
            <>
              <p className="text-sm text-foreground mb-1">Drop a CSV or Excel file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </>
          )}
        </div>
      )}

      {/* === CONNECT MODE === */}
      {inputMode === "connect" && (
        <div className="space-y-4">
          {/* Provider selector */}
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => {
              const selected = selectedProvider === p;
              return (
                <button
                  key={p}
                  onClick={() => { setSelectedProvider(p); setError(""); }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border transition-colors text-left ${
                    selected
                      ? "border-[#7C3AED] bg-[#7C3AED]/10"
                      : "border-border hover:border-border/80 bg-secondary/30"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PROVIDER_COLORS[p] }}
                  />
                  <span className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                    {PROVIDER_LABELS[p]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* API key input */}
          {selectedProvider && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  {PROVIDER_LABELS[selectedProvider]} API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your API key here"
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {selectedProvider === "plusvibe" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    PlusVibe Workspace ID
                  </label>
                  <input
                    type="text"
                    value={providerWorkspaceId}
                    onChange={(e) => setProviderWorkspaceId(e.target.value)}
                    placeholder="Your PlusVibe workspace ID"
                    className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!apiKey.trim() || isImporting || (selectedProvider === "plusvibe" && !providerWorkspaceId.trim())}
                className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isImporting ? "Importing..." : "Connect & Import"}
              </button>

              <p className="text-[10px] text-muted-foreground">
                Your API key is used for this import only and is not stored.
              </p>
            </div>
          )}
        </div>
      )}

      {/* === MANUAL MODE === */}
      {inputMode === "manual" && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Campaign name"
              value={manualRow.campaign_name ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, campaign_name: e.target.value })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
            <select
              value={manualRow.channel ?? "email"}
              onChange={(e) => setManualRow({ ...manualRow, channel: e.target.value as CampaignChannel })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground"
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <input
              type="number"
              placeholder="Sent"
              value={manualRow.sent ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, sent: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="number"
              placeholder="Open %"
              value={manualRow.open_rate ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, open_rate: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="number"
              placeholder="Reply %"
              value={manualRow.reply_rate ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, reply_rate: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="number"
              placeholder="Meetings"
              value={manualRow.meetings_booked ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, meetings_booked: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={addManualRow}
            disabled={!manualRow.campaign_name?.trim()}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
          >
            Add Campaign
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      {/* Imported sources */}
      {dataSources.length > 0 && (
        <div className="mt-4 space-y-2">
          {dataSources.map((ds, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                {ds.type !== "csv" && ds.type !== "manual" && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PROVIDER_COLORS[ds.type as OutboundProvider] }}
                  />
                )}
                <span className="text-sm text-foreground">{sourceLabel(ds)}</span>
                <span className="text-xs text-muted-foreground">
                  {ds.rows.length} campaign{ds.rows.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => removeSource(i)}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{totalRows} total campaigns loaded</p>
        </div>
      )}
    </div>
  );
}
