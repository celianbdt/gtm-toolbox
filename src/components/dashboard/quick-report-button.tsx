"use client";

import Link from "next/link";
import { FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickReportButton({
  workspaceSlug,
}: {
  workspaceSlug: string;
}) {
  return (
    <Button variant="ghost" size="xs" asChild>
      <Link href={`/workspaces/${workspaceSlug}/projects?tab=reports`}>
        <FileTextIcon data-icon="inline-start" />
        Report
      </Link>
    </Button>
  );
}
