"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
};

export function WorkspaceCards({ workspaces }: { workspaces: Workspace[] }) {
  if (workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No workspaces yet. Create your first one to start.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((ws) => (
        <Link key={ws.id} href={`/${ws.slug}`}>
          <Card className="group cursor-pointer transition-colors hover:border-primary/50">
            <CardContent>
              <div className="flex items-center gap-3">
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: ws.color }}
                />
                <span className="flex-1 truncate text-base font-medium">
                  {ws.name}
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {ws.description && (
                <p className="mt-2 pl-6 text-sm text-muted-foreground line-clamp-2">
                  {ws.description}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
