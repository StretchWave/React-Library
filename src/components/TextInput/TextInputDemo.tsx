// TextInput demo — controlled value plus the invalid/helper-text state.
import { useState } from "react";
import { TextInput } from "./TextInput";
import "../theme-demo.css";

export function TextInputDemo() {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <div data-demo-id="text-input" className="rl-demo">
      <TextInput
        label="Username"
        placeholder="e.g. ada_lovelace"
        helperText={invalid ? "Usernames start with a letter." : "Live preview — flip the toggle to see failure state."}
        invalid={invalid}
        value={invalid ? value : value}
        onChange={(next) => {
          setValue(next);
          setInvalid(next.length > 0 && !/^[a-zA-Z]/.test(next));
        }}
      />
      <p className="rl-demo-row">
        <small>value: {value === "" ? "(empty)" : value}</small>
      </p>
    </div>
  );
}
