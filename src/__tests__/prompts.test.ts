import { describe, it, expect } from "vitest";
import {
  buildCampaignDataPrompt,
  buildAnalyzerAssessmentPrompt,
  buildStrategyDebatePrompt,
  buildSequenceGenerationPrompt,
} from "@/lib/outbound-builder/prompts";
import type { CampaignRow, ICPDefinition, ChannelConfig, SequenceParams } from "@/lib/outbound-builder/types";

const sampleRows: CampaignRow[] = [
  {
    campaign_name: "Q1 Enterprise",
    channel: "email",
    segment: "Enterprise",
    sent: 500,
    open_rate: 45,
    reply_rate: 8,
    meetings_booked: 12,
    period: "Q1 2026",
  },
  {
    campaign_name: "LinkedIn SMB",
    channel: "linkedin",
    segment: "SMB",
    sent: 200,
    open_rate: undefined,
    reply_rate: 15,
    meetings_booked: 5,
  },
];

const sampleICP: ICPDefinition = {
  title: "VP Sales Outreach",
  persona_role: "VP of Sales",
  industry: "SaaS B2B",
  company_size: "100-500",
  pain_points: ["Scaling outbound", "Low reply rates"],
  value_props: ["3x more meetings", "AI-powered sequences"],
};

const sampleChannels: ChannelConfig = { email: true, linkedin: true, call: false };

const sampleParams: SequenceParams = {
  sequence_length: 5,
  total_duration_days: 21,
  ab_variants: true,
  tone: "conversational",
  language: "fr",
};

describe("Outbound Prompts", () => {
  describe("buildCampaignDataPrompt", () => {
    it("includes campaign data", () => {
      const prompt = buildCampaignDataPrompt(sampleRows, "Our product is X", "");
      expect(prompt).toContain("Q1 Enterprise");
      expect(prompt).toContain("LinkedIn SMB");
      expect(prompt).toContain("email");
      expect(prompt).toContain("Our product is X");
    });

    it("includes tool insights when provided", () => {
      const prompt = buildCampaignDataPrompt(sampleRows, "", "Battle card insights here");
      expect(prompt).toContain("Battle card insights here");
      expect(prompt).toContain("Prior Analysis Insights");
    });

    it("omits insights block when empty", () => {
      const prompt = buildCampaignDataPrompt(sampleRows, "", "");
      expect(prompt).not.toContain("Prior Analysis Insights");
    });
  });

  describe("buildAnalyzerAssessmentPrompt", () => {
    it("includes focus dimensions and KPI summary", () => {
      const prompt = buildAnalyzerAssessmentPrompt(
        sampleRows,
        '{"avg_open_rate": 45}',
        ["segment-performance", "channel-effectiveness"],
        "Why did LinkedIn work better?",
        "Our company context",
        "GTM knowledge",
        ""
      );

      expect(prompt).toContain("Segment Performance");
      expect(prompt).toContain("Channel Effectiveness");
      expect(prompt).toContain("Why did LinkedIn work better?");
      expect(prompt).toContain("avg_open_rate");
      expect(prompt).toContain("under 150 words");
    });
  });

  describe("buildStrategyDebatePrompt", () => {
    it("includes ICP and channel config", () => {
      const prompt = buildStrategyDebatePrompt(
        sampleICP,
        sampleChannels,
        sampleParams,
        "Company context",
        "Playbook insights",
        "CI insights"
      );

      expect(prompt).toContain("VP of Sales");
      expect(prompt).toContain("SaaS B2B");
      expect(prompt).toContain("Scaling outbound");
      expect(prompt).toContain("email, linkedin");
      expect(prompt).toContain("5 touchpoints");
      expect(prompt).toContain("conversational");
      expect(prompt).toContain("French");
      expect(prompt).toContain("Playbook insights");
      expect(prompt).toContain("CI insights");
    });

    it("omits playbook when empty", () => {
      const prompt = buildStrategyDebatePrompt(
        sampleICP,
        sampleChannels,
        sampleParams,
        "",
        "",
        ""
      );

      expect(prompt).not.toContain("Strategic Playbook Insights");
      expect(prompt).not.toContain("Cross-Tool Insights");
    });
  });

  describe("buildSequenceGenerationPrompt", () => {
    it("includes all configuration", () => {
      const prompt = buildSequenceGenerationPrompt(
        sampleICP,
        sampleChannels,
        sampleParams,
        "[Agent]: email should lead",
        "Context",
        "Playbook data",
        ""
      );

      expect(prompt).toContain("VP of Sales");
      expect(prompt).toContain("5 touchpoints");
      expect(prompt).toContain("21 days");
      expect(prompt).toContain("French");
      expect(prompt).toContain("A/B variants");
      expect(prompt).toContain("email should lead");
      expect(prompt).toContain("Playbook data");
    });

    it("disables A/B when not requested", () => {
      const noAB = { ...sampleParams, ab_variants: false };
      const prompt = buildSequenceGenerationPrompt(
        sampleICP,
        sampleChannels,
        noAB,
        "debate",
        "",
        "",
        ""
      );

      expect(prompt).not.toContain("generate A/B variants");
    });
  });
});
