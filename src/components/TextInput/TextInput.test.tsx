import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextInput } from "./TextInput";

describe("TextInput (M3 library component)", () => {
  it("binds the visible label to the control and reports value changes", () => {
    const onChange = vi.fn();
    render(<TextInput label="Username" value="" onChange={onChange} />);
    const input = screen.getByLabelText("Username") as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: "ada" } });
    expect(onChange).toHaveBeenCalledWith("ada");
  });

  it("invalid state sets aria-invalid and helper text is described-by", () => {
    render(<TextInput label="Email" helperText="Enter a valid address" invalid />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const helper = screen.getByText("Enter a valid address");
    expect(input.getAttribute("aria-describedby")).toBe(helper.id);
  });
});
