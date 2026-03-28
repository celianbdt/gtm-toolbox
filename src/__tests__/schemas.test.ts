import { describe, it, expect } from "vitest";
import { DebateSummarySchema } from "@/lib/debate/schemas";
import {
  CampaignKPISummarySchema,
  StrategicPlaybookSchema,
  OutboundSequenceSchema,
  ABVariantSchema,
  SequencePackageSchema,
} from "@/lib/outbound-builder/schemas";

describe("Debate Summary Schema", () => {
  it("validates a correct debate summary", () => {
    const data = {
      key_decisions: [
        { topic: "Channel strategy", decision: "Lead with email", confidence: "high" },
      ],
      key_takeaways: ["Email outperforms LinkedIn for enterprise"],
      unresolved_tensions: ["Pricing strategy unclear"],
      strategic_recommendations: ["Double down on email sequences"],
    };

    const result = DebateSummarySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid confidence level", () => {
    const data = {
      key_decisions: [
        { topic: "Test", decision: "Test", confidence: "very_high" },
      ],
      key_takeaways: [],
      unresolved_tensions: [],
      strategic_recommendations: [],
    };

    const result = DebateSummarySchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("Campaign KPI Summary Schema", () => {
  it("validates correct KPI data", () => {
    const data = {
      total_campaigns_analyzed: 5,
      overall_metrics: {
        avg_open_rate: 45.2,
        avg_reply_rate: 8.5,
        avg_meetings_rate: 2.1,
        total_sent: 5000,
      },
      top_performing_campaign: {
        name: "Q1 Enterprise Push",
        why: "Highest reply rate at 15%",
      },
      worst_performing_campaign: {
        name: "Summer Promo",
        why: "Only 2% open rate, likely spam issues",
      },
    };

    const result = CampaignKPISummarySchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("Strategic Playbook Schema", () => {
  it("validates a minimal playbook", () => {
    const data = {
      executive_summary: "Our outbound needs multi-channel approach.",
      segments: [
        {
          name: "Enterprise",
          performance_rating: "strong",
          key_metrics: { avg_open_rate: 50 },
          insights: ["High engagement from VP-level"],
          recommendations: ["Increase volume"],
        },
      ],
      channel_analysis: [
        {
          channel: "email",
          effectiveness: "high",
          best_use_case: "Initial outreach",
          optimization_tips: ["Better subject lines"],
        },
      ],
      cadence_insights: {
        optimal_touchpoints: "5-7 per sequence",
        best_days: ["Tuesday", "Thursday"],
        best_times: ["9am", "2pm"],
        spacing_recommendation: "2-3 days between touchpoints",
      },
      kpi_benchmarks: [
        {
          metric: "Open Rate",
          current_value: "45%",
          benchmark: "50%",
          gap_assessment: "Slightly below benchmark",
        },
      ],
      lessons_learned: [
        {
          lesson: "Personalization drives replies",
          evidence: "Personalized emails got 3x reply rate",
          action: "Implement first-line personalization",
        },
      ],
      top_recommendations: ["Focus on email + LinkedIn combo"],
    };

    const result = StrategicPlaybookSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("Outbound Sequence Schema", () => {
  it("validates a sequence with all channels", () => {
    const data = {
      sequence_name: "Enterprise VP Sales Q2",
      target_icp: "VP of Sales at SaaS 200-500 emp",
      total_touchpoints: 3,
      total_duration_days: 14,
      steps: [
        {
          step_number: 1,
          day: 1,
          channel: "email",
          action_type: "initial_email",
          subject: "Quick question about your outbound",
          body: "Hi {{first_name}}, noticed your team is scaling...",
          notes: "Personalize first line with recent company news",
          goal: "Get the open and click",
        },
        {
          step_number: 2,
          day: 3,
          channel: "linkedin",
          action_type: "connection_request",
          body: "Hi {{first_name}}, I see we share connections in the SaaS space.",
          notes: "Send after email open if possible",
          goal: "Build familiarity",
        },
        {
          step_number: 3,
          day: 7,
          channel: "call",
          action_type: "cold_call",
          body: "Follow-up call referencing email and LinkedIn",
          call_script: "Hi {{first_name}}, this is X from Y. I sent you an email earlier this week about...",
          notes: "Best between 9-11am",
          goal: "Book the meeting",
        },
      ],
      strategy_rationale: "Email-first to warm up, LinkedIn to build familiarity, call to close.",
    };

    const result = OutboundSequenceSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid channel", () => {
    const data = {
      sequence_name: "Test",
      target_icp: "Test",
      total_touchpoints: 1,
      total_duration_days: 1,
      steps: [
        {
          step_number: 1,
          day: 1,
          channel: "sms",  // Invalid
          action_type: "test",
          body: "test",
          notes: "test",
          goal: "test",
        },
      ],
      strategy_rationale: "test",
    };

    const result = OutboundSequenceSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("A/B Variant Schema", () => {
  it("validates a variant pair", () => {
    const data = {
      step_number: 1,
      variant_a: {
        subject: "Quick question",
        body: "Hi {{name}}, I noticed...",
        hypothesis: "Curiosity-driven subject line increases opens",
      },
      variant_b: {
        subject: "Idea for {{company}}",
        body: "Hi {{name}}, had an idea for...",
        hypothesis: "Company-specific subject drives higher engagement",
      },
      what_to_measure: "Open rate and reply rate after 48h",
    };

    const result = ABVariantSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("Sequence Package Schema", () => {
  it("validates a full package", () => {
    const data = {
      sequences: [
        {
          sequence_name: "Test",
          target_icp: "VP Sales",
          total_touchpoints: 1,
          total_duration_days: 7,
          steps: [
            {
              step_number: 1,
              day: 1,
              channel: "email",
              action_type: "initial",
              subject: "Test",
              body: "Test body",
              notes: "Note",
              goal: "Open",
            },
          ],
          strategy_rationale: "Simple test",
        },
      ],
      overall_strategy: "Email-first approach targeting VP Sales",
      expected_metrics: {
        target_open_rate: "45-55%",
        target_reply_rate: "8-12%",
        target_meeting_rate: "2-3%",
      },
    };

    const result = SequencePackageSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
