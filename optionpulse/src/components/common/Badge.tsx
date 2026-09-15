import type { ReactNode } from "react";
import { classNames } from "../../utils/format";

export type BadgeTone = "neutral" | "accent" | "bull" | "bear" | "warn" | "violet";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** Renders a leading dot; `pulse` animates it for live-ish states. */
  dot?: boolean;
  pulse?: boolean;
  title?: string;
  className?: string;
}

export function Badge({
  tone = "neutral",
  children,
  dot,
  pulse,
  title,
  className,
}: BadgeProps) {
  return (
    <span className={classNames("badge", `badge--${tone}`, className)} title={title}>
      {dot && <span className={classNames("badge__dot", pulse && "badge__dot--live")} />}
      {children}
    </span>
  );
}
