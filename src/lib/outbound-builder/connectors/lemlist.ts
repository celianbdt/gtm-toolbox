import type { CampaignRow, SequenceStep, CampaignChannel } from "../types";

const BASE_URL = "https://api.lemlist.com/api";

function authHeaders(apiKey: string): HeadersInit {
  const encoded = Buffer.from(`:${apiKey}`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

// Lemlist campaign object — fields returned by GET /api/campaigns
type LemlistCampaign = {
  _id: string;
  name: string;
  status?: string; // "draft" | "paused" | "running" | "done" | "archived"
  createdAt?: string;
  labels?: string[];
  type?: string; // "email" | "multichannel"
  // Stats included directly in campaign list response
  sendCount?: number;
  openCount?: number;
  openRate?: number;
  clickCount?: number;
  clickRate?: number;
  replyCount?: number;
  replyRate?: number;
  bookedCount?: number;
  // Some API versions use different field names
  sent?: number;
  opened?: number;
  replied?: number;
  clicked?: number;
  booked?: number;
};

// Lemlist sequence step — various field names across API versions
type LemlistSequenceStep = {
  type?: string; // "email" | "linkedin" | "manual" | "api" | "linkedinInvitation" | "linkedinMessage"
  channel?: string;
  subject?: string;
  emailSubject?: string;
  text?: string;
  emailBody?: string;
  body?: string;
  content?: string;
  message?: string;
  delayInDays?: number;
  delay?: number;
};

function mapStepChannel(type: string): CampaignChannel {
  const t = type.toLowerCase();
  if (t.includes("linkedin")) return "linkedin";
  if (t.includes("email") || t === "default") return "email";
  if (t.includes("call") || t.includes("phone")) return "call";
  return "other";
}

export async function fetchLemlistCampaigns(apiKey: string): Promise<CampaignRow[]> {
  // Step 1: List all campaigns
  const res = await fetch(`${BASE_URL}/campaigns`, {
    headers: authHeaders(apiKey),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("Invalid Lemlist API key. Check your key in Settings.");
    }
    throw new Error(`Lemlist API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  let campaigns: LemlistCampaign[];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      campaigns = parsed;
    } else if (parsed && typeof parsed === "object") {
      campaigns = (parsed.data ?? parsed.campaigns ?? []) as LemlistCampaign[];
    } else {
      campaigns = [];
    }
  } catch {
    throw new Error(`Lemlist returned invalid JSON. Response: ${text.slice(0, 100)}`);
  }

  if (campaigns.length === 0) {
    return [];
  }

  // Step 2: For each campaign, try to get detailed stats via /activities endpoint
  // The list endpoint may include stats inline — use those first
  const rows: CampaignRow[] = [];
  const chunks = chunkArray(campaigns, 5);

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async (campaign) => {
        // Extract stats from campaign object (inline from list response)
        let sent = campaign.sendCount ?? campaign.sent ?? 0;
        let opened = campaign.openCount ?? campaign.opened ?? 0;
        let openRate = campaign.openRate ?? 0;
        let replied = campaign.replyCount ?? campaign.replied ?? 0;
        let replyRate = campaign.replyRate ?? 0;
        let clicked = campaign.clickCount ?? campaign.clicked ?? 0;
        let booked = campaign.bookedCount ?? campaign.booked ?? 0;

        // If no inline stats, try fetching from /statistics endpoint
        if (sent === 0) {
          try {
            const statsRes = await fetch(
              `${BASE_URL}/campaigns/${campaign._id}`,
              {
                headers: authHeaders(apiKey),
                signal: AbortSignal.timeout(10000),
              }
            );
            if (statsRes.ok) {
              const detail = await statsRes.json();
              sent = detail.sendCount ?? detail.sent ?? sent;
              opened = detail.openCount ?? detail.opened ?? opened;
              openRate = detail.openRate ?? openRate;
              replied = detail.replyCount ?? detail.replied ?? replied;
              replyRate = detail.replyRate ?? replyRate;
              clicked = detail.clickCount ?? detail.clicked ?? clicked;
              booked = detail.bookedCount ?? detail.booked ?? booked;
            }
          } catch {
            // Keep whatever we have
          }
        }

        // Compute rates if not provided
        if (sent > 0 && openRate === 0 && opened > 0) {
          openRate = Math.round((opened / sent) * 10000) / 100;
        }
        if (sent > 0 && replyRate === 0 && replied > 0) {
          replyRate = Math.round((replied / sent) * 10000) / 100;
        }

        // Step 3: Fetch sequence content (email subjects, bodies, LinkedIn steps)
        let sequenceSteps: SequenceStep[] = [];
        try {
          const seqRes = await fetch(
            `${BASE_URL}/campaigns/${campaign._id}/sequences`,
            {
              headers: authHeaders(apiKey),
              signal: AbortSignal.timeout(10000),
            }
          );
          if (seqRes.ok) {
            const seqData = await seqRes.json();
            // Lemlist returns an array of sequence steps
            const steps = Array.isArray(seqData) ? seqData : (seqData?.steps ?? seqData?.sequences ?? []);
            sequenceSteps = steps.map((step: LemlistSequenceStep, idx: number) => {
              const stepChannel = mapStepChannel(step.type ?? step.channel ?? "email");
              return {
                step_number: idx + 1,
                channel: stepChannel,
                subject: step.subject ?? step.emailSubject ?? undefined,
                body: step.text ?? step.emailBody ?? step.body ?? step.content ?? step.message ?? undefined,
                delay_days: step.delayInDays ?? step.delay ?? undefined,
              };
            });
          }
        } catch {
          // Sequence fetch failed — continue without content
        }

        const channelType = campaign.type === "multichannel" ? "other" as const : "email" as const;
        const statusLabel = campaign.status ?? "unknown";
        const isActive = statusLabel === "running";

        return {
          campaign_name: campaign.name,
          channel: channelType,
          segment: campaign.labels?.join(", "),
          sent: sent || undefined,
          opened: opened || undefined,
          open_rate: openRate || undefined,
          replied: replied || undefined,
          reply_rate: replyRate || undefined,
          clicked: clicked || undefined,
          meetings_booked: booked || undefined,
          period: campaign.createdAt?.slice(0, 10),
          notes: `Status: ${statusLabel}${isActive ? " 🟢" : ""}${campaign.type ? ` | Type: ${campaign.type}` : ""}`,
          sequence_steps: sequenceSteps.length > 0 ? sequenceSteps : undefined,
        };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        rows.push(result.value);
      }
    }
  }

  return rows;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
