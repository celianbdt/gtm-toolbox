import { describe, it, expect } from "vitest";
import type {
  AnalyzerSessionConfig,
  BuilderSessionConfig,
  OBSessionConfig,
} from "@/lib/outbound-builder/types";
import { ANALYZER_FOCUS_LABELS } from "@/lib/outbound-builder/types";
import type { DebateSessionConfig } from "@/lib/debate/types";
import type { CISessionConfig } from "@/lib/competitive-intel/types";

describe("Type Compatibility", () => {
  it("DebateSessionConfig supports insight_session_ids", () => {
    const config: DebateSessionConfig = {
      mission: "Test mission",
      max_turns: 10,
      agent_ids: ["a1"],
      current_turn: 0,
      insight_session_ids: ["session-1", "session-2"],
    };
    expect(config.insight_session_ids).toHaveLength(2);
  });

  it("DebateSessionConfig works without insight_session_ids", () => {
    const config: DebateSessionConfig = {
      mission: "Test",
      max_turns: 5,
      agent_ids: ["a1"],
      current_turn: 0,
    };
    expect(config.insight_session_ids).toBeUndefined();
  });

  it("CISessionConfig supports insight_session_ids", () => {
    const config: CISessionConfig = {
      competitors: [],
      focus_dimensions: ["positioning"],
      analyst_agent_ids: ["a1"],
      current_phase: "data-processing",
      phase_config: { debate_rounds: 1 },
      insight_session_ids: ["s1"],
    };
    expect(config.insight_session_ids).toHaveLength(1);
  });

  it("AnalyzerSessionConfig has correct mode", () => {
    const config: AnalyzerSessionConfig = {
      mode: "analyzer",
      campaign_data: [{ type: "csv", filename: "test.csv", rows: [] }],
      focus_dimensions: ["segment-performance"],
      analyst_agent_ids: ["a1"],
      current_phase: "data-processing",
      phase_config: { debate_rounds: 1 },
    };
    expect(config.mode).toBe("analyzer");
  });

  it("BuilderSessionConfig has correct mode and optional playbook", () => {
    const config: BuilderSessionConfig = {
      mode: "builder",
      icp: {
        title: "Test",
        persona_role: "VP Sales",
        pain_points: ["Scaling"],
        value_props: ["More meetings"],
      },
      channels: { email: true, linkedin: false, call: false },
      sequence_params: {
        sequence_length: 5,
        total_duration_days: 21,
        ab_variants: false,
        tone: "conversational",
        language: "fr",
      },
      playbook_session_id: "playbook-123",
      analyst_agent_ids: ["a1"],
      current_phase: "context-loading",
      insight_session_ids: ["s1"],
    };
    expect(config.mode).toBe("builder");
    expect(config.playbook_session_id).toBe("playbook-123");
  });

  it("OBSessionConfig union works for both modes", () => {
    const analyzer: OBSessionConfig = {
      mode: "analyzer",
      campaign_data: [],
      focus_dimensions: [],
      analyst_agent_ids: [],
      current_phase: "data-processing",
      phase_config: { debate_rounds: 1 },
    };

    const builder: OBSessionConfig = {
      mode: "builder",
      icp: { title: "", persona_role: "", pain_points: [], value_props: [] },
      channels: { email: true, linkedin: false, call: false },
      sequence_params: {
        sequence_length: 5,
        total_duration_days: 21,
        ab_variants: false,
        tone: "formal",
        language: "en",
      },
      analyst_agent_ids: [],
      current_phase: "context-loading",
    };

    expect(analyzer.mode).toBe("analyzer");
    expect(builder.mode).toBe("builder");
  });

  it("ANALYZER_FOCUS_LABELS has all focus types", () => {
    expect(Object.keys(ANALYZER_FOCUS_LABELS)).toHaveLength(5);
    expect(ANALYZER_FOCUS_LABELS["segment-performance"]).toBe("Segment Performance");
    expect(ANALYZER_FOCUS_LABELS["channel-effectiveness"]).toBe("Channel Effectiveness");
    expect(ANALYZER_FOCUS_LABELS["timing-cadence"]).toBe("Timing & Cadence");
    expect(ANALYZER_FOCUS_LABELS["messaging-patterns"]).toBe("Messaging Patterns");
    expect(ANALYZER_FOCUS_LABELS["conversion-funnel"]).toBe("Conversion Funnel");
  });
});
