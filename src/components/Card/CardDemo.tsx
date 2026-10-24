// Card demo — shows elevation/padding presets and the optional title slot.
import { Card } from "./Card";
import "../theme-demo.css";

export function CardDemo() {
  return (
    <div data-demo-id="card" className="rl-demo">
      <div className="rl-demo-card-grid">
        <Card title="Raised card">
          Elevation comes from the theme's <code>--rl-shadow</code> token — hard edges in
          Brutalist Print, glass glow in Midnight Glass.
        </Card>
        <Card elevation="flat" padding="compact">
          Flat + compact: no shadow, tighter padding, same surface tokens.
        </Card>
      </div>
    </div>
  );
}
