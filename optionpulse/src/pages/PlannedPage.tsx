import { Panel } from "../components/common/Panel";
import { Badge } from "../components/common/Badge";

interface PlannedPageProps {
  title: string;
  summary: string;
  /** What this screen will do, stated plainly rather than mocked up. */
  scope: string[];
  phase: string;
}

/**
 * Honest placeholder for sections that are designed but not yet built. It shows
 * no numbers, because showing invented ones would be worse than showing none.
 */
export function PlannedPage({ title, summary, scope, phase }: PlannedPageProps) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-head__title">{title}</h1>
          <p className="page-head__subtitle">{summary}</p>
        </div>
        <Badge tone="warn">{phase}</Badge>
      </div>

      <Panel title="Planned scope" subtitle="Not yet implemented">
        <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {scope.map((item) => (
            <li key={item} style={{ display: "flex", gap: "var(--space-2)" }}>
              <span aria-hidden style={{ color: "var(--accent)" }}>
                &middot;
              </span>
              <span style={{ fontSize: "var(--text-sm)" }}>{item}</span>
            </li>
          ))}
        </ul>
        <p className="inline-note" style={{ marginTop: "var(--space-4)" }}>
          This screen deliberately shows no figures until the feature is wired to the data
          layer.
        </p>
      </Panel>
    </>
  );
}
