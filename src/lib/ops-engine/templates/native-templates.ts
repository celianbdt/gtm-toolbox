// ── Native Templates — Client-side reference ──
// Used by the UI to display template cards before querying the database.

export type NativeTemplateRef = {
  name: string;
  slug: string;
  description: string;
  icon: string;
};

export const NATIVE_TEMPLATES: NativeTemplateRef[] = [
  {
    name: "Funding Trigger",
    slug: "funding-trigger",
    description:
      "Track companies that recently raised funding in your target market",
    icon: "TrendingUp",
  },
  {
    name: "Hiring Intent",
    slug: "hiring-intent",
    description:
      "Detect companies hiring for roles that signal buying intent",
    icon: "UserPlus",
  },
  {
    name: "Champion Change",
    slug: "champion-change",
    description:
      "Track when decision-makers change companies — warm intro opportunities",
    icon: "ArrowRightLeft",
  },
  {
    name: "Web Intent",
    slug: "web-intent",
    description:
      "Identify anonymous website visitors and score buying intent",
    icon: "Eye",
  },
  {
    name: "ICP Discovery",
    slug: "icp-discovery",
    description:
      "Explore a new market segment and find matching companies",
    icon: "Search",
  },
  {
    name: "CRM Enrichment",
    slug: "crm-enrichment",
    description: "Enrich your existing CRM contacts with fresh data",
    icon: "RefreshCw",
  },
  {
    name: "Event Leads",
    slug: "event-leads",
    description: "Process and enrich lists of event attendees",
    icon: "CalendarDays",
  },
];
