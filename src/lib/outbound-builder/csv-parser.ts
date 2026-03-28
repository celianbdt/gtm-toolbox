import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { CampaignRow, CampaignChannel } from "./types";

const CHANNEL_ALIASES: Record<string, CampaignChannel> = {
  email: "email",
  mail: "email",
  "e-mail": "email",
  linkedin: "linkedin",
  li: "linkedin",
  call: "call",
  phone: "call",
  cold_call: "call",
};

const COLUMN_MAP: Record<string, keyof CampaignRow> = {
  campaign_name: "campaign_name",
  campaign: "campaign_name",
  name: "campaign_name",
  channel: "channel",
  segment: "segment",
  sent: "sent",
  total_sent: "sent",
  opened: "opened",
  open_rate: "open_rate",
  "open rate": "open_rate",
  replied: "replied",
  replies: "replied",
  reply_rate: "reply_rate",
  "reply rate": "reply_rate",
  clicked: "clicked",
  meetings_booked: "meetings_booked",
  meetings: "meetings_booked",
  booked: "meetings_booked",
  conversion_rate: "conversion_rate",
  "conversion rate": "conversion_rate",
  period: "period",
  date: "period",
  notes: "notes",
};

function normalizeColumn(col: string): string {
  return col.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, "");
}

function parseChannel(val: string): CampaignChannel {
  const normalized = val.trim().toLowerCase();
  return CHANNEL_ALIASES[normalized] ?? "other";
}

function parseNumber(val: unknown): number | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  const str = String(val).replace(/[%,]/g, "").trim();
  const num = Number(str);
  return isNaN(num) ? undefined : num;
}

function rowFromRecord(record: Record<string, unknown>, columnMapping: Record<string, keyof CampaignRow>): CampaignRow {
  const row: Partial<CampaignRow> = {};
  const extras: Record<string, string | number> = {};

  for (const [rawCol, value] of Object.entries(record)) {
    const mapped = columnMapping[normalizeColumn(rawCol)];
    if (!mapped) {
      if (value !== null && value !== undefined && value !== "") {
        extras[rawCol] = typeof value === "number" ? value : String(value);
      }
      continue;
    }

    switch (mapped) {
      case "campaign_name":
        row.campaign_name = String(value ?? "");
        break;
      case "channel":
        row.channel = parseChannel(String(value ?? ""));
        break;
      case "segment":
      case "period":
      case "notes":
        row[mapped] = String(value ?? "");
        break;
      default:
        (row as Record<string, unknown>)[mapped] = parseNumber(value);
    }
  }

  return {
    campaign_name: row.campaign_name ?? "Unnamed Campaign",
    channel: row.channel ?? "other",
    segment: row.segment,
    sent: row.sent,
    opened: row.opened,
    open_rate: row.open_rate,
    replied: row.replied,
    reply_rate: row.reply_rate,
    clicked: row.clicked,
    meetings_booked: row.meetings_booked,
    conversion_rate: row.conversion_rate,
    period: row.period,
    notes: row.notes,
    extras: Object.keys(extras).length > 0 ? extras : undefined,
  };
}

export function autoMapColumns(headers: string[]): Record<string, keyof CampaignRow> {
  const mapping: Record<string, keyof CampaignRow> = {};
  for (const header of headers) {
    const normalized = normalizeColumn(header);
    const mapped = COLUMN_MAP[normalized];
    if (mapped) {
      mapping[normalized] = mapped;
    }
  }
  return mapping;
}

export async function parseCampaignCSV(file: File): Promise<{ rows: CampaignRow[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const mapping = autoMapColumns(headers);
        const rows = (results.data as Record<string, unknown>[])
          .slice(0, 500)
          .map((record) => rowFromRecord(record, mapping));
        resolve({ rows, headers });
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export async function parseCampaignExcel(file: File): Promise<{ rows: CampaignRow[]; headers: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const headers = Object.keys(data[0] ?? {});
  const mapping = autoMapColumns(headers);
  const rows = data.slice(0, 500).map((record) => rowFromRecord(record, mapping));
  return { rows, headers };
}

export async function parseCampaignFile(file: File): Promise<{ rows: CampaignRow[]; headers: string[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCampaignCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseCampaignExcel(file);
  throw new Error(`Unsupported file format: .${ext}`);
}
