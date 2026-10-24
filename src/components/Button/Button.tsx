// Button (catalog id: button). Styles come exclusively from theme tokens.
import type { MouseEvent, ReactNode } from "react";
import "./Button.css";

export interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`rl-button rl-button--${variant} rl-button--${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
