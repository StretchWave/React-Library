// Badge (catalog id: badge). Tone colors map to theme tokens; semantic tones
// (success/warning/danger) intentionally reuse the app-level --rl-status-*
// tokens so meaning stays constant across themes (see checklist decisions).
import type { ReactNode } from "react";
import "./Badge.css";

export interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
}

export function Badge({ children, tone = "neutral", size = "md" }: BadgeProps) {
  return (
    <span className={`rl-badge rl-badge--${tone} rl-badge--${size}`}>
      {children}
    </span>
  );
}
