import type { AgentConfig } from "./types";

const SIGNAL_PATTERNS = {
  contradiction: /\b(but|however|disagree|wrong|actually|challenge|incorrect|doubt|question|pushback|on the contrary|that said|contrary)\b/i,
  new_data: /\b(data|study|report|numbers|metric|percent|evidence|research|survey|statistics|benchmark|findings|analysis)\b/i,
  customer_mention: /\b(customer|user|buyer|client|prospect|persona|end user|buyer|segment|audience|account)\b/i,
  strategy_shift: /\b(pivot|change|rethink|instead|new approach|strategy|alternative|shift|reconsider|different|reframe|angle)\b/i,
};

export function scoreEngagement(agent: AgentConfig, lastMessage: string): number {
  const text = lastMessage.toLowerCase();

  // Topic match (0–0.4)
  const topics = agent.personality?.trigger_topics ?? [];
  const matchedTopics = topics.filter((t) => text.includes(t.toLowerCase())).length;
  const topicScore = topics.length > 0 ? (matchedTopics / topics.length) * 0.4 : 0;

  // Signal classification (0–0.6)
  const weights = agent.engagement_weights ?? {
    contradiction: 0.5,
    new_data: 0.5,
    customer_mention: 0.5,
    strategy_shift: 0.5,
  };

  let signalScore = 0;
  for (const [key, pattern] of Object.entries(SIGNAL_PATTERNS) as [
    keyof typeof SIGNAL_PATTERNS,
    RegExp
  ][]) {
    if (pattern.test(text)) {
      signalScore += (weights[key] ?? 0.5) * 0.15;
    }
  }
  signalScore = Math.min(signalScore, 0.6);

  return Math.min(topicScore + signalScore, 1.0);
}

export function selectRespondingAgents(
  agents: AgentConfig[],
  lastMessage: string,
  threshold = 0.35
): { agent: AgentConfig; score: number }[] {
  const scored = agents.map((agent) => ({
    agent,
    score: scoreEngagement(agent, lastMessage),
  }));

  const above = scored.filter((s) => s.score >= threshold);

  // Always ensure at least 1 agent responds (highest scorer)
  if (above.length === 0) {
    const best = scored.sort((a, b) => b.score - a.score)[0];
    return best ? [best] : [];
  }

  return above.sort((a, b) => b.score - a.score);
}
