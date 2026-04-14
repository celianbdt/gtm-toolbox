"use client";

import { useState, useCallback, useEffect } from "react";
import type { CampaignRow, CampaignDataSource, CampaignChannel, ImportSessionConfig } from "@/lib/outbound-builder/types";
import { parseCampaignFile } from "@/lib/outbound-builder/csv-parser";
import type { OutboundProvider } from "@/lib/outbound-builder/connectors";
import { PROVIDER_LABELS, PROVIDER_COLORS } from "@/lib/outbound-builder/connectors";

type Props = {
  workspaceId: string;
  dataSources: CampaignDataSource[];
  onChange: (ds: CampaignDataSource[]) => void;
};

const CHANNELS: CampaignChannel[] = ["email", "linkedin", "call", "other"];
const PROVIDERS: OutboundProvider[] = ["lemlist", "instantly", "plusvibe", "smartlead"];

type InputMode = "library" | "file" | "connect" | "manual";

type ImportEntry = {
  id: string;
  title: string;
  created_at: string;
  config: ImportSessionConfig;
};

export function CampaignDataStep({ workspaceId, dataSources, onChange }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("library");
  const [manualRow, setManualRow] = useState<Partial<CampaignRow>>({
    campaign_name: "",
    channel: "email",
  });

  // Connect state
  const [selectedProvider, setSelectedProvider] = useState<OutboundProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [providerWorkspaceId, setProviderWorkspaceId] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Library state
  const [imports, setImports] = useState<ImportEntry[]>([]);
  const [loadingImports, setLoadingImports] = useState(true);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());

  const totalRows = dataSources.reduce((sum, ds) => sum + ds.rows.length, 0);

  // Load existing imports
  useEffect(() => {
    async function loadImports() {
      try {
        const res = await fetch(`/api/outbound-builder/imports?workspaceId=${workspaceId}`);
        if (res.ok) {
          const { imports: data } = await res.json();
          setImports(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingImports(false);
      }
    }
    loadImports();
  }, [workspaceId]);

  // Toggle import selection
  function toggleImport(imp: ImportEntry) {
    const next = new Set(selectedImportIds);
    if (next.has(imp.id)) {
      next.delete(imp.id);
      // Remove this import's data from dataSources
      onChange(dataSources.filter((ds) => ds.filename !== `import:${imp.id}`));
    } else {
      next.add(imp.id);
      // Add this import's data to dataSources
      const importData = imp.config.campaign_data;
      for (const ds of importData) {
        onChange([...dataSources, { ...ds, filename: `import:${imp.id}` }]);
      }
    }
    setSelectedImportIds(next);
  }

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

  const handleToolImport = async () => {
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

      const newSource: CampaignDataSource = {
        type: selectedProvider,
        filename: `${PROVIDER_LABELS[selectedProvider]} (${data.campaignCount} campaigns)`,
        rows: data.rows,
      };

      // Save to library
      await fetch("/api/outbound-builder/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          mode: "import",
          campaignData: [newSource],
          title: `${PROVIDER_LABELS[selectedProvider]} — ${data.campaignCount} campaigns`,
        }),
      });

      // Also add to current selection
      onChange([...dataSources, newSource]);
      setApiKey("");
      setProviderWorkspaceId("");

      // Refresh library
      const importsRes = await fetch(`/api/outbound-builder/imports?workspaceId=${workspaceId}`);
      if (importsRes.ok) {
        const { imports: updated } = await importsRes.json();
        setImports(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileImportToLibrary = async (file: File) => {
    setIsUploading(true);
    setError("");
    try {
      const { rows } = await parseCampaignFile(file);
      if (rows.length === 0) {
        setError("No data found in file");
        return;
      }

      const newSource: CampaignDataSource = { type: "csv", filename: file.name, rows };

      // Save to library
      await fetch("/api/outbound-builder/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          mode: "import",
          campaignData: [newSource],
          title: `CSV — ${file.name} (${rows.length} campaigns)`,
        }),
      });

      // Add to current selection
      onChange([...dataSources, newSource]);

      // Refresh library
      const importsRes = await fetch(`/api/outbound-builder/imports?workspaceId=${workspaceId}`);
      if (importsRes.ok) {
        const { imports: updated } = await importsRes.json();
        setImports(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setIsUploading(false);
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
    if (ds.filename?.startsWith("import:")) return "From library";
    if (ds.type === "csv") return ds.filename ?? "CSV file";
    if (ds.type === "manual") return "Manual entries";
    return ds.filename ?? PROVIDER_LABELS[ds.type as OutboundProvider] ?? ds.type;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Campaign Data</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Select from your library, import new data, or enter manually.
      </p>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit mb-6">
        {([
          { key: "library" as const, label: "Library" },
          { key: "file" as const, label: "CSV / Excel" },
          { key: "connect" as const, label: "Connect Tool" },
          { key: "manual" as const, label: "Manual" },
        ]).map((m) => (
          <button
            key={m.key}
            onClick={() => { setInputMode(m.key); setError(""); }}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              inputMode === m.key
                ? "bg-[#8a6e4e] text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
            {m.key === "library" && imports.length > 0 && (
              <span className="ml-1.5 text-[10px] opacity-70">({imports.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* === LIBRARY MODE === */}
      {inputMode === "library" && (
        <div>
          {loadingImports ? (
            <p className="text-sm text-muted-foreground">Loading library...</p>
          ) : imports.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">No imports yet</p>
              <p className="text-xs text-muted-foreground">
                Import campaigns via CSV or connect a tool — they will appear here for reuse.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                Select which imports to include in this analysis.
              </p>
              {imports.map((imp) => {
                const checked = selectedImportIds.has(imp.id);
                const date = new Date(imp.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                });
                const sources = imp.config.campaign_data;
                const sourceTypes = sources.map((s) =>
                  s.type === "csv" ? "CSV" : PROVIDER_LABELS[s.type as OutboundProvider] ?? s.type
                ).join(", ");

                return (
                  <label
                    key={imp.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                      checked ? "border-[#8a6e4e] bg-[#8a6e4e]/10" : "border-border hover:border-border/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleImport(imp)}
                      className="rounded border-border text-[#8a6e4e] focus:ring-[#8a6e4e] w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{imp.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sourceTypes} · {imp.config.total_campaigns} campaigns · {date}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === FILE MODE === */}
      {inputMode === "file" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-[#8a6e4e]/50 transition-colors cursor-pointer"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv,.xlsx,.xls";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileImportToLibrary(file);
            };
            input.click();
          }}
        >
          {isUploading ? (
            <p className="text-sm text-muted-foreground">Parsing & saving to library...</p>
          ) : (
            <>
              <p className="text-sm text-foreground mb-1">Drop a CSV or Excel file here</p>
              <p className="text-xs text-muted-foreground">Saved to your library for future use</p>
            </>
          )}
        </div>
      )}

      {/* === CONNECT MODE === */}
      {inputMode === "connect" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => {
              const selected = selectedProvider === p;
              return (
                <button
                  key={p}
                  onClick={() => { setSelectedProvider(p); setError(""); }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border transition-colors text-left ${
                    selected
                      ? "border-[#8a6e4e] bg-[#8a6e4e]/10"
                      : "border-border hover:border-border/80 bg-secondary/30"
                  }`}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[p] }} />
                  <span className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                    {PROVIDER_LABELS[p]}
                  </span>
                </button>
              );
            })}
          </div>

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
                onClick={handleToolImport}
                disabled={!apiKey.trim() || isImporting || (selectedProvider === "plusvibe" && !providerWorkspaceId.trim())}
                className="px-4 py-2 bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isImporting ? "Importing..." : "Connect & Import"}
              </button>

              <p className="text-[10px] text-muted-foreground">
                Imported data is saved to your library for future use. API key is not stored.
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
            <input type="number" placeholder="Sent" value={manualRow.sent ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, sent: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="number" placeholder="Open %" value={manualRow.open_rate ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, open_rate: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="number" placeholder="Reply %" value={manualRow.reply_rate ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, reply_rate: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="number" placeholder="Meetings" value={manualRow.meetings_booked ?? ""}
              onChange={(e) => setManualRow({ ...manualRow, meetings_booked: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground" />
          </div>
          <button
            onClick={addManualRow}
            disabled={!manualRow.campaign_name?.trim()}
            className="px-4 py-2 bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
          >
            Add Campaign
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      {/* Selected data summary */}
      {dataSources.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Selected for analysis</h3>
          {dataSources.map((ds, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                {ds.type !== "csv" && ds.type !== "manual" && !ds.filename?.startsWith("import:") && (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[ds.type as OutboundProvider] }} />
                )}
                <span className="text-sm text-foreground">{sourceLabel(ds)}</span>
                <span className="text-xs text-muted-foreground">
                  {ds.rows.length} campaign{ds.rows.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button onClick={() => removeSource(i)}
                className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
          ))}
          <p className="text-xs text-[#c4a882]">{totalRows} total campaigns selected</p>
        </div>
      )}
    </div>
  );
}
