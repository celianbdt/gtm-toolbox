import { Badge } from "@/components/ui/badge";

type MissionStage = "discovery" | "foundation" | "optimization" | "scaling";

const STAGE_CONFIG: Record<MissionStage, { label: string; color: string }> = {
  discovery: { label: "Discovery", color: "#3b82f6" },
  foundation: { label: "Foundation", color: "#8b5cf6" },
  optimization: { label: "Optimization", color: "#f59e0b" },
  scaling: { label: "Scaling", color: "#10b981" },
};

export function StageBadge({ stage }: { stage: MissionStage }) {
  const config = STAGE_CONFIG[stage];
  return (
    <Badge
      variant="outline"
      style={{
        borderColor: `${config.color}50`,
        color: config.color,
        backgroundColor: `${config.color}15`,
      }}
      className="text-[10px] font-medium"
    >
      {config.label}
    </Badge>
  );
}
