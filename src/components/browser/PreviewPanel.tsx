// Live preview (M3/M4): renders the selected entry's demo inside the active
// theme scope and offers a copyable usage snippet derived from catalog data.
import { useEffect, useState } from "react";
import { getDemo } from "../../catalog/demos";
import type { CatalogEntry } from "../../catalog/types";
import { useTheme } from "../../theme/ThemeProvider";
import { copyText } from "../../lib/clipboard";

export function usageSnippet(entry: CatalogEntry): string {
  const source = entry.links?.source ?? entry.implementation?.[0];
  // Derived identifier: catalog name with non-word chars stripped, so it stays
  // a valid JSX symbol even for sourced names like "Button (shadcn)".
  const identifier = entry.name.replace(/[^a-zA-Z0-9]/g, "");
  const importLine = source
    ? `import { ${identifier} } from "${source.replace(/\.tsx$/, "")}";`
    : `// ${entry.name} (no source link registered in the catalog yet)`;
  const propsLine = entry.props
    .filter((prop) => prop.required)
    .map((prop) => `${prop.name}={/* ${prop.type} */}`)
    .join(" ");
  const example = `<${identifier}${propsLine ? " " + propsLine : ""} />`;
  return [importLine, "", `npm run lookup -- ${entry.id} --json   // full catalog record`, "", example].join("\n");
}

export function PreviewPanel({ entry }: { entry: CatalogEntry | null }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [entry?.id]);

  if (!entry) return null;
  const Demo = getDemo(entry.id);

  async function handleCopy(): Promise<void> {
    if (!entry) return;
    const ok = await copyText(usageSnippet(entry));
    setCopied(ok);
  }

  return (
    <section
      className="preview-panel"
      data-testid="live-preview"
      aria-label={`Live preview of ${entry.name}`}
    >
      <div className="preview-heading-row">
        <h3 className="preview-heading">Live preview</h3>
        <button
          type="button"
          className="preview-copy"
          aria-label={`Copy usage snippet for ${entry.name}`}
          onClick={handleCopy}
        >
          {copied ? "Copied ✓" : "Copy usage"}
        </button>
      </div>
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
