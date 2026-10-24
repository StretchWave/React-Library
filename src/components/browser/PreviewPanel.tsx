// Live preview (M3): renders the selected entry's demo inside the active theme
// scope. Lives outside DetailPane so the detail record stays provider-free.
import { getDemo } from "../../catalog/demos";
import type { CatalogEntry } from "../../catalog/types";
import { useTheme } from "../../theme/ThemeProvider";

export function PreviewPanel({ entry }: { entry: CatalogEntry | null }) {
  const { theme } = useTheme();
  if (!entry) return null;
  const Demo = getDemo(entry.id);

  return (
    <section
      className="preview-panel"
      data-testid="live-preview"
      aria-label={`Live preview of ${entry.name}`}
    >
      <h3 className="preview-heading">Live preview</h3>
      <p className="preview-hint">
        Rendered in the active theme: <strong>{theme.label}</strong>. Use the theme
        picker to restyle instantly — colors come only from the taxonomy tokens.
      </p>
      <div className="preview-stage">
        {Demo ? (
          <Demo />
        ) : (
          <p className="preview-hint">No demo wired for “{entry.id}” yet.</p>
        )}
      </div>
    </section>
  );
}
