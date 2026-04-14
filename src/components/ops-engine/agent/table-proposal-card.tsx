"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table2,
  Columns3,
  BarChart3,
  Rows3,
  ArrowRight,
  Zap,
  Brain,
  FileText,
  Radio,
} from "lucide-react";

const COLUMN_TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  signal_input: {
    label: "Signal",
    icon: Radio,
    color: "bg-blue-500/10 text-blue-600",
  },
  enricher: {
    label: "Enricher",
    icon: Zap,
    color: "bg-emerald-500/10 text-emerald-600",
  },
  ai_column: {
    label: "AI",
    icon: Brain,
    color: "bg-purple-500/10 text-purple-600",
  },
  formula: {
    label: "Formula",
    icon: FileText,
    color: "bg-primary/10 text-primary",
  },
  static: {
    label: "Static",
    icon: Columns3,
    color: "bg-gray-500/10 text-gray-600",
  },
};

type Props = {
  tableId: string;
  tableName: string;
  columnsByType: Record<string, number>;
  scoringRulesCount: number;
  rowsInserted: number;
};

export function TableProposalCard({
  tableId,
  tableName,
  columnsByType,
  scoringRulesCount,
  rowsInserted,
}: Props) {
  const router = useRouter();

  const totalColumns = Object.values(columnsByType).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table2 className="size-5 text-emerald-500" />
          {tableName}
        </CardTitle>
        <CardDescription>
          Table created and configured by the Ops Agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Columns summary */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Columns3 className="size-3" />
              Columns
            </div>
            <p className="text-2xl font-semibold">{totalColumns}</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(columnsByType).map(([type, count]) => {
                const meta = COLUMN_TYPE_META[type] ?? COLUMN_TYPE_META.static;
                return (
                  <Badge
                    key={type}
                    variant="secondary"
                    className={`text-[10px] ${meta.color}`}
                  >
                    {count} {meta.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Scoring */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="size-3" />
              Scoring Rules
            </div>
            <p className="text-2xl font-semibold">{scoringRulesCount}</p>
          </div>

          {/* Rows */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Rows3 className="size-3" />
              Rows
            </div>
            <p className="text-2xl font-semibold">{rowsInserted}</p>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="size-3" />
              Status
            </div>
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-600"
            >
              Ready
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => router.push(`/ops-engine/tables/${tableId}`)}
          className="gap-2"
        >
          View Table
          <ArrowRight className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
