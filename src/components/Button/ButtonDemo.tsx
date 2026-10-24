// Button demo — showcases the cataloged API (variant/size/disabled).
import { Button } from "./Button";

export function ButtonDemo() {
  return (
    <div data-demo-id="button" className="rl-demo">
      <div className="rl-demo-row">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="rl-demo-row">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
  );
}
