// Alert demo — the four tones plus the dismissible state.
import { Alert } from "./Alert";
import "../theme-demo.css";

export function AlertDemo() {
  return (
    <div data-demo-id="alert" className="rl-demo">
      <Alert title="Published to the catalog">New entries appear in the canonical catalog first.</Alert>
      <Alert tone="success" title="Validation passed">
        Catalog, taxonomy, and index are all in sync.
      </Alert>
      <Alert tone="warning" title="Drift expected">
        The generated index rewrites on every data change.
      </Alert>
      <Alert tone="danger" title="Dismiss me (danger)">
        The ✕ button is wired to the uncontrolled dismissal state from the catalog contract.
      </Alert>
    </div>
  );
}
