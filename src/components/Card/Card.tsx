// Card (catalog id: card). Container surface; every visual token resolves
// through --rl-* so the same Card is native in all six themes.
import type { ReactNode } from "react";
import "./Card.css";

export interface CardProps {
  children: ReactNode;
  title?: string;
  elevation?: "flat" | "raised";
  padding?: "compact" | "normal";
}

export function Card({
  children,
  title,
  elevation = "raised",
  padding = "normal",
}: CardProps) {
  return (
    <section
      className={`rl-card rl-card--${elevation} rl-card--${padding}`}
      aria-label={title}
    >
      {title ? <h3 className="rl-card__title">{title}</h3> : null}
      <div className="rl-card__body">{children}</div>
    </section>
  );
}
