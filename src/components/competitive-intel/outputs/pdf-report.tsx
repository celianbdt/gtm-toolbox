"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { BattleCard, PositioningMatrix, ObjectionPlaybook, ThreatAssessment } from "@/lib/competitive-intel/schemas";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a2e",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#8a6e4e",
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#8a6e4e",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  cardContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  badge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    color: "#ffffff",
  },
  badgeCritical: { backgroundColor: "#ef4444" },
  badgeHigh: { backgroundColor: "#f97316" },
  badgeMedium: { backgroundColor: "#eab308" },
  badgeLow: { backgroundColor: "#22c55e" },
  oneLiner: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#4b5563",
    marginTop: 8,
    marginBottom: 4,
  },
  listItem: {
    fontSize: 9,
    marginBottom: 3,
    paddingLeft: 8,
  },
  listItemBold: {
    fontFamily: "Helvetica-Bold",
  },
  talkTrack: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#374151",
    marginTop: 4,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  threatRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 6,
  },
  threatCol: {
    flex: 1,
    fontSize: 9,
  },
  overallPosition: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f5f3ff",
    borderRadius: 4,
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9ca3af",
  },
  matrixInsight: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
    padding: 10,
    backgroundColor: "#f5f3ff",
    borderRadius: 4,
    marginTop: 8,
  },
  matrixPlayer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  matrixDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

type ReportData = {
  title: string;
  date: string;
  battleCards: BattleCard[];
  positioningMatrix: PositioningMatrix | null;
  objectionPlaybooks: ObjectionPlaybook[];
  threatAssessment: ThreatAssessment | null;
};

function getBadgeStyle(level: string) {
  switch (level) {
    case "critical": return styles.badgeCritical;
    case "high": return styles.badgeHigh;
    case "medium": return styles.badgeMedium;
    default: return styles.badgeLow;
  }
}

export function CIReport({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>
            Competitive Intelligence Report — {data.date}
          </Text>
        </View>

        {/* Battle Cards */}
        {data.battleCards.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Battle Cards</Text>
            {data.battleCards.map((card, i) => (
              <View key={i} style={styles.cardContainer} wrap={false}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{card.competitor_name}</Text>
                  <Text style={[styles.badge, getBadgeStyle(card.threat_level)]}>
                    {card.threat_level.toUpperCase()} THREAT
                  </Text>
                </View>
                <Text style={styles.oneLiner}>{card.one_liner}</Text>

                <Text style={styles.subTitle}>Strengths</Text>
                {card.strengths.map((s, j) => (
                  <Text key={j} style={styles.listItem}>
                    <Text style={styles.listItemBold}>• {s.point}</Text> — {s.evidence}
                  </Text>
                ))}

                <Text style={styles.subTitle}>Exploitable Weaknesses</Text>
                {card.weaknesses.map((w, j) => (
                  <Text key={j} style={styles.listItem}>
                    <Text style={styles.listItemBold}>• {w.point}</Text> — {w.how_to_exploit}
                  </Text>
                ))}

                <Text style={styles.subTitle}>Landmine Questions</Text>
                {card.landmines.map((l, j) => (
                  <Text key={j} style={styles.listItem}>• &ldquo;{l}&rdquo;</Text>
                ))}

                <Text style={styles.subTitle}>Winning Talk Track</Text>
                <Text style={styles.talkTrack}>{card.winning_talk_track}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Text>GTM Toolbox — Competitive Intel</Text>
          <Text>{data.date}</Text>
        </View>
      </Page>

      {/* Positioning Matrix Page */}
      {data.positioningMatrix && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Positioning Matrix</Text>
          <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 8 }}>
            X: {data.positioningMatrix.axes.x.label} ({data.positioningMatrix.axes.x.low_label} → {data.positioningMatrix.axes.x.high_label})
          </Text>
          <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 12 }}>
            Y: {data.positioningMatrix.axes.y.label} ({data.positioningMatrix.axes.y.low_label} → {data.positioningMatrix.axes.y.high_label})
          </Text>

          {data.positioningMatrix.players.map((player, i) => (
            <View key={i} style={styles.matrixPlayer}>
              <View
                style={[
                  styles.matrixDot,
                  { backgroundColor: player.is_us ? "#8a6e4e" : "#9ca3af" },
                ]}
              />
              <Text style={{ fontSize: 10, fontFamily: player.is_us ? "Helvetica-Bold" : "Helvetica" }}>
                {player.name} ({player.x}, {player.y})
              </Text>
              <Text style={{ fontSize: 9, color: "#6b7280" }}> — {player.annotation}</Text>
            </View>
          ))}

          <Text style={styles.matrixInsight}>{data.positioningMatrix.insight}</Text>

          <View style={styles.footer}>
            <Text>GTM Toolbox — Competitive Intel</Text>
            <Text>{data.date}</Text>
          </View>
        </Page>
      )}

      {/* Objection Playbooks Page */}
      {data.objectionPlaybooks.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Objection Playbooks</Text>
          {data.objectionPlaybooks.map((pb, i) => (
            <View key={i} style={styles.cardContainer} wrap={false}>
              <Text style={styles.cardTitle}>vs {pb.competitor_name}</Text>
              {pb.objections.map((obj, j) => (
                <View key={j} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>
                    &ldquo;{obj.objection}&rdquo;
                  </Text>
                  <Text style={{ fontSize: 9, color: "#374151", marginTop: 2 }}>
                    Response: {obj.response_strategy}
                  </Text>
                  <Text style={{ fontSize: 9, color: "#8a6e4e", marginTop: 2 }}>
                    Follow-up: &ldquo;{obj.follow_up_question}&rdquo;
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.footer}>
            <Text>GTM Toolbox — Competitive Intel</Text>
            <Text>{data.date}</Text>
          </View>
        </Page>
      )}

      {/* Threat Assessment Page */}
      {data.threatAssessment && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Threat & Opportunity Assessment</Text>

          <Text style={styles.subTitle}>Threats</Text>
          {data.threatAssessment.threats.map((t, i) => (
            <View key={i} style={styles.threatRow}>
              <Text style={[styles.threatCol, { flex: 0.6 }]}>{t.competitor}</Text>
              <Text style={[styles.threatCol, { flex: 1.5 }]}>{t.threat}</Text>
              <Text style={[styles.threatCol, { flex: 0.5, textTransform: "uppercase", fontSize: 8 }]}>
                {t.severity}
              </Text>
              <Text style={[styles.threatCol, { flex: 1 }]}>{t.recommended_action}</Text>
            </View>
          ))}

          <Text style={[styles.subTitle, { marginTop: 16 }]}>Opportunities</Text>
          {data.threatAssessment.opportunities.map((o, i) => (
            <View key={i} style={styles.threatRow}>
              <Text style={[styles.threatCol, { flex: 1.5 }]}>{o.description}</Text>
              <Text style={[styles.threatCol, { flex: 0.8 }]}>{o.competitors_affected.join(", ")}</Text>
              <Text style={[styles.threatCol, { flex: 1 }]}>{o.action}</Text>
            </View>
          ))}

          <Text style={styles.overallPosition}>
            {data.threatAssessment.overall_competitive_position}
          </Text>

          <View style={styles.footer}>
            <Text>GTM Toolbox — Competitive Intel</Text>
            <Text>{data.date}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
