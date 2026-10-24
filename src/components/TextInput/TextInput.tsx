// TextInput (catalog id: text-input). Label is programmatically bound, helper
// text via aria-describedby, invalid → aria-invalid. Controlled API per catalog.
import { useId } from "react";
import "./TextInput.css";

export interface TextInputProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  helperText?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  invalid = false,
  helperText,
}: TextInputProps) {
  const generatedId = useId();
  const helperId = helperText ? `${generatedId}-helper` : undefined;

  return (
    <div className={invalid ? "rl-text-input is-invalid" : "rl-text-input"}>
      <label className="rl-text-input__label" htmlFor={generatedId}>
        {label}
      </label>
      <input
        id={generatedId}
        className="rl-text-input__control"
        value={value === undefined ? undefined : value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={helperId}
        onChange={(event) => onChange?.(event.target.value)}
      />
      {helperText ? (
        <p
          id={helperId}
          className={invalid ? "rl-text-input__helper rl-text-input__helper--error" : "rl-text-input__helper"}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
