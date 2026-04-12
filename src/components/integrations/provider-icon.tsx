"use client";

import {
  Building2,
  Target,
  Database,
  Users,
  BookOpen,
  MessageSquare,
  Plug,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Building2,
  Target,
  Database,
  Users,
  BookOpen,
  MessageSquare,
};

export function ProviderIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = ICON_MAP[icon] ?? Plug;
  return <Icon className={className} />;
}
