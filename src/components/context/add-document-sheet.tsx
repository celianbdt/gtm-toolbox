"use client";

import { useState, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import type { ContextDocument, DocType } from "@/lib/context/types";
import { DOC_TYPES } from "@/lib/context/types";

type Tab = "write" | "import" | "tools";
type ToolMode = "url" | "notion" | "gdocs" | "crm";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  editDoc?: ContextDocument | null;
  onSaved: (doc: ContextDocument) => void;
};

const ACCEPTED_TYPES = ".txt,.md,.pdf,.docx";

// ─── Shared form fields ───────────────────────────────────────────────────────

function FormFields({
  title,
  docType,
  content,
  onTitleChange,
  onDocTypeChange,
  onContentChange,
  contentPlaceholder,
  readonlyContent,
}: {
  title: string;
  docType: DocType;
  content: string;
  onTitleChange: (v: string) => void;
  onDocTypeChange: (v: DocType) => void;
  onContentChange: (v: string) => void;
  contentPlaceholder?: string;
  readonlyContent?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Document title"
          className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <select
          value={docType}
          onChange={(e) => onDocTypeChange(e.target.value as DocType)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-zinc-500"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        readOnly={readonlyContent}
        placeholder={contentPlaceholder ?? "Document content..."}
        rows={14}
        className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 font-mono"
      />
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function AddDocumentSheet({
  open,
  onOpenChange,
  workspaceId,
  editDoc,
  onSaved,
}: Props) {
  const isEdit = !!editDoc;

  const [tab, setTab] = useState<Tab>("write");
  const [title, setTitle] = useState(editDoc?.title ?? "");
  const [docType, setDocType] = useState<DocType>(editDoc?.doc_type ?? "general");
  const [content, setContent] = useState(editDoc?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Import tab
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  // Tools tab
  const [toolMode, setToolMode] = useState<ToolMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [notionToken, setNotionToken] = useState("");
  const [gdocsUrl, setGdocsUrl] = useState("");
  const [crmUrl, setCrmUrl] = useState("");
  const [crmApiKey, setCrmApiKey] = useState("");
  const [fetching, setFetching] = useState(false);
  const [toolError, setToolError] = useState("");

  function reset() {
    setTitle("");
    setDocType("general");
    setContent("");
    setError("");
    setImportError("");
    setToolError("");
    setTab("write");
    setUrlInput("");
    setNotionUrl("");
    setGdocsUrl("");
    setCrmUrl("");
    setCrmApiKey("");
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();

    let result;
    if (isEdit && editDoc) {
      result = await supabase
        .from("context_documents")
        .update({ title: title.trim(), content: content.trim(), doc_type: docType })
        .eq("id", editDoc.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("context_documents")
        .insert({ workspace_id: workspaceId, title: title.trim(), content: content.trim(), doc_type: docType })
        .select()
        .single();
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      onSaved(result.data as ContextDocument);
      reset();
      onOpenChange(false);
    }
    setSaving(false);
  }

  // ── File import ──
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError("");

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "txt" || ext === "md") {
      const text = await file.text();
      setContent(text);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } else {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/context/parse-file", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Parse failed");
      } else {
        setContent(data.text);
        if (!title) setTitle(data.filename.replace(/\.[^.]+$/, ""));
      }
    }

    setImporting(false);
    if (e.target) e.target.value = "";
  }, [title]);

  // ── Tools fetch ──
  async function handleToolFetch() {
    setFetching(true);
    setToolError("");

    let endpoint = "";
    let body: Record<string, string> = {};

    if (toolMode === "url") {
      if (!urlInput.trim()) { setToolError("Enter a URL"); setFetching(false); return; }
      endpoint = "/api/context/scrape-url";
      body = { url: urlInput.trim() };
    } else if (toolMode === "notion") {
      if (!notionUrl.trim() || !notionToken.trim()) { setToolError("URL and token required"); setFetching(false); return; }
      endpoint = "/api/context/import-notion";
      body = { pageUrl: notionUrl.trim(), token: notionToken.trim() };
    } else if (toolMode === "gdocs") {
      if (!gdocsUrl.trim()) { setToolError("Enter a Google Docs URL"); setFetching(false); return; }
      endpoint = "/api/context/import-gdocs";
      body = { url: gdocsUrl.trim() };
    } else if (toolMode === "crm") {
      if (!crmUrl.trim() || !crmApiKey.trim()) { setToolError("CRM URL and API Key required"); setFetching(false); return; }
      // CRM import creates multiple documents directly — different flow
      const res = await fetch("/api/context/import-crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, crmUrl: crmUrl.trim(), apiKey: crmApiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToolError(data.error ?? "CRM import failed");
      } else {
        // CRM creates multiple docs — trigger parent refresh and close
        if (data.documents?.length) {
          onSaved(data.documents[0] as ContextDocument);
          reset();
          onOpenChange(false);
        }
      }
      setFetching(false);
      return;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setToolError(data.error ?? "Import failed");
    } else {
      setContent(data.text ?? "");
      if (!title && data.title) setTitle(data.title);
    }
    setFetching(false);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "write", label: "Write" },
    { id: "import", label: "Import file" },
    { id: "tools", label: "Import from tool" },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle>{isEdit ? "Edit document" : "Add context document"}</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        {!isEdit && (
          <div className="flex gap-1 px-6 py-3 border-b border-border bg-zinc-950">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 px-6 py-6 space-y-6">
          {/* ── Write tab ── */}
          {(tab === "write" || isEdit) && (
            <FormFields
              title={title}
              docType={docType}
              content={content}
              onTitleChange={setTitle}
              onDocTypeChange={setDocType}
              onContentChange={setContent}
              contentPlaceholder="Write your context here... (ICP definition, product overview, competitor analysis, etc.)"
            />
          )}

          {/* ── Import file tab ── */}
          {tab === "import" && !isEdit && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-zinc-500 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
                <div className="text-3xl mb-3">📄</div>
                <p className="text-sm text-muted-foreground mb-1">
                  Click to select a file
                </p>
                <p className="text-xs text-muted-foreground">.txt · .md · .pdf · .docx</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {importing && <p className="text-sm text-muted-foreground text-center">Parsing file...</p>}
              {importError && <p className="text-sm text-red-400">{importError}</p>}

              {/* Show form once content is populated */}
              {content && (
                <FormFields
                  title={title}
                  docType={docType}
                  content={content}
                  onTitleChange={setTitle}
                  onDocTypeChange={setDocType}
                  onContentChange={setContent}
                />
              )}
            </div>
          )}

          {/* ── Tools tab ── */}
          {tab === "tools" && !isEdit && (
            <div className="space-y-5">
              {/* Tool mode selector */}
              <div className="flex gap-2 flex-wrap">
                {(["url", "notion", "gdocs", "crm"] as ToolMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setToolMode(m); setToolError(""); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      toolMode === m
                        ? "border-violet-600 bg-violet-950 text-violet-300"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "url" ? "🔗 URL" : m === "notion" ? "📓 Notion" : m === "gdocs" ? "📊 Google Docs" : "🏢 CRM"}
                  </button>
                ))}
              </div>

              {/* URL mode */}
              {toolMode === "url" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Paste any public URL — blog post, landing page, article. We'll extract the text content.
                  </p>
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/blog/post"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              )}

              {/* Notion mode */}
              {toolMode === "notion" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Setup required</p>
                    <p>1. Go to <span className="text-primary">notion.so/my-integrations</span> and create an integration</p>
                    <p>2. Copy the <span className="text-primary">Internal Integration Token</span> (starts with <code>secret_</code>)</p>
                    <p>3. Share your Notion page with the integration (page menu → Connections)</p>
                  </div>
                  <input
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder="secret_xxxxxxxxxxxxxxxx"
                    type="password"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                  <input
                    value={notionUrl}
                    onChange={(e) => setNotionUrl(e.target.value)}
                    placeholder="https://notion.so/My-Page-abc123..."
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              )}

              {/* CRM mode */}
              {toolMode === "crm" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">CRM Integration</p>
                    <p>Import contacts, deals, activities, KPIs and engagement data from your CRM API.</p>
                    <p>Existing CRM documents will be <span className="text-primary">replaced</span> with fresh data.</p>
                  </div>
                  <input
                    value={crmUrl}
                    onChange={(e) => setCrmUrl(e.target.value)}
                    placeholder="https://your-crm.vercel.app/api/v1/export/workspace?workspace_id=..."
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                  <input
                    value={crmApiKey}
                    onChange={(e) => setCrmApiKey(e.target.value)}
                    placeholder="API Key"
                    type="password"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
              )}

              {/* Google Docs mode */}
              {toolMode === "gdocs" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-card border border-border p-3 text-xs text-muted-foreground">
                    <p>The document must be shared with <span className="text-primary">"Anyone with the link"</span> (viewer access is enough).</p>
                  </div>
                  <input
                    value={gdocsUrl}
                    onChange={(e) => setGdocsUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              )}

              <button
                onClick={handleToolFetch}
                disabled={fetching}
                className="px-4 py-2 bg-violet-600 hover:bg-primary disabled:opacity-50 text-foreground text-sm font-medium rounded-lg transition-colors"
              >
                {fetching ? "Importing..." : "Import"}
              </button>

              {toolError && <p className="text-sm text-red-400">{toolError}</p>}

              {/* Show form once content is populated */}
              {content && (
                <FormFields
                  title={title}
                  docType={docType}
                  content={content}
                  onTitleChange={setTitle}
                  onDocTypeChange={setDocType}
                  onContentChange={setContent}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => { reset(); onOpenChange(false); }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className="px-5 py-2 bg-violet-600 hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-foreground text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? "Saving..." : isEdit ? "Save changes" : "Add document"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
