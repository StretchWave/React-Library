// Badge demo — all cataloged tones and sizes.
import { Badge } from "./Badge";
import "../theme-demo.css";

export function BadgeDemo() {
  return (
    <div data-demo-id="badge" className="rl-demo">
      <div className="rl-demo-row">
        <Badge>neutral</Badge>
        <Badge tone="accent">accent</Badge>
        <Badge tone="success">success</Badge>
        <Badge tone="warning">warning</Badge>
        <Badge tone="danger">danger</Badge>
      </div>
      <div className="rl-demo-row">
        <Badge size="sm">small</Badge>
        <Badge size="md">medium</Badge>
      </div>
    </div>
  );
}
