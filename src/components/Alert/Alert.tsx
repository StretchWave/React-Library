// Alert (catalog id: alert). role="alert" announces insertion; dismissal is
// uncontrolled per the catalog contract. Info uses the theme accent; semantic
// tones reuse the app-level status vocabulary (see Badge.css note).
import { useState, type ReactNode } from "react";
import "./Alert.css";

export interface AlertProps {
  title: string;
  children?: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
  dismissible?: boolean;
}

const ICONS: Record<NonNullable<AlertProps["tone"]>, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  danger: "✕",
};

export function Alert({ title, children, tone = "info", dismissible = false }: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className={`rl-alert rl-alert--${tone}`} role="alert">
      <span className="rl-alert__icon" aria-hidden="true">
        {ICONS[tone]}
      </span>
      <div className="rl-alert__body">
        <p className="rl-alert__title">{title}</p>
        {children ? <div className="rl-alert__content">{children}</div> : null}
      </div>
      {dismissible ? (
        <button
          type="button"
          className="rl-alert__dismiss"
          aria-label="Dismiss alert"
          onClick={() => setDismissed(true)}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
