import { useState } from 'react';

// Minimal view of the API's scan response (only what this page renders).
interface Finding {
  advisoryId: string;
  package: string;
  version: string;
  severity: string;
  direct: boolean;
  title: string;
}
interface Scan {
  id: string;
  verdict: 'allow' | 'warn' | 'block';
  findings: Finding[];
}

const VERDICT_ICON: Record<Scan['verdict'], string> = {
  allow: '✓',
  warn: '!',
  block: '✕',
};
const VERDICT_SUB: Record<Scan['verdict'], string> = {
  allow: 'No blocking issues — cleared by policy.',
  warn: 'Allowed with warnings — review recommended.',
  block: 'Blocked by policy — action required.',
};

const KNOWN_SEVERITIES = ['critical', 'high', 'moderate', 'low'];

// Quick-fill examples that map to each verdict, for fast demoing.
const EXAMPLES: { label: string; deps: string }[] = [
  { label: 'Blocked (critical)', deps: 'log4jira@2.10.0' },
  { label: 'Warn (transitive)', deps: 'config-loader@1.0.0' },
  { label: 'Allowed (clean)', deps: 'express-lite@4.2.0' },
];

/** Parse "log4jira@2.10.0, left-hand@2.0.0" into [{name, version}, ...]. */
function parseDependencies(input: string): { name: string; version: string }[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const at = token.lastIndexOf('@');
      return at > 0
        ? { name: token.slice(0, at), version: token.slice(at + 1) }
        : { name: token, version: '0.0.0' };
    });
}

export function Dashboard() {
  const [name, setName] = useState('demo-app');
  const [version, setVersion] = useState('1.0.0');
  const [deps, setDeps] = useState('log4jira@2.10.0');
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setScan(null);
    try {
      // 1) index the artifact, 2) scan it — the API returns the verdict + findings.
      const artifactRes = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          version,
          ecosystem: 'npm',
          dependencies: parseDependencies(deps),
        }),
      });
      if (!artifactRes.ok) throw new Error(`index failed (${artifactRes.status})`);
      const artifact = (await artifactRes.json()) as { id: string };

      const scanRes = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ artifactId: artifact.id }),
      });
      if (!scanRes.ok) throw new Error(`scan failed (${scanRes.status})`);
      setScan((await scanRes.json()) as Scan);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const sevClass = (severity: string) =>
    KNOWN_SEVERITIES.includes(severity) ? `sev-${severity}` : 'sev-low';

  return (
    <div>
      <div className="page-head">
        <h1>Scan an artifact</h1>
        <p>
          Submit an artifact and its dependencies to get a policy verdict and the findings behind
          it.
        </p>
      </div>

      <div className="dash-grid">
        {/* ---- form ---- */}
        <section className="card">
          <h2>Artifact</h2>
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="f-name">Name</label>
              <input
                id="f-name"
                className="input"
                data-testid="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="f-version">Version</label>
              <input
                id="f-version"
                className="input"
                data-testid="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="f-deps">Dependencies</label>
              <input
                id="f-deps"
                className="input"
                data-testid="deps"
                value={deps}
                onChange={(e) => setDeps(e.target.value)}
              />
              <span className="hint">Format: name@version, comma-separated</span>
            </div>

            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  className="chip-btn"
                  onClick={() => setDeps(ex.deps)}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <button className="btn btn-primary" data-testid="submit" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Scanning…
                </>
              ) : (
                'Scan artifact'
              )}
            </button>
          </form>
        </section>

        {/* ---- results ---- */}
        <div className="results-panel">
          {error && <div className="error-banner" data-testid="error">{`Error: ${error}`}</div>}

          {!scan && !error && (
            <div className="empty-state">
              <div className="big">🔍</div>
              <div>Run a scan to see the verdict and findings.</div>
            </div>
          )}

          {scan && (
            <section data-testid="results" className="results-panel">
              <div className={`verdict-card v-${scan.verdict}`}>
                <span className="verdict-dot" aria-hidden="true">
                  {VERDICT_ICON[scan.verdict]}
                </span>
                <div className="verdict-meta">
                  <span className="verdict-label">Verdict</span>
                  {/* NOTE: keep raw verdict as the ONLY text in this span (used by E2E). */}
                  <span className="verdict" data-testid="verdict">
                    {scan.verdict}
                  </span>
                  <span className="verdict-sub">{VERDICT_SUB[scan.verdict]}</span>
                </div>
              </div>

              <p className="findings-head">
                {scan.findings.length} finding{scan.findings.length === 1 ? '' : 's'}
              </p>

              {scan.findings.length === 0 ? (
                <p data-testid="no-findings" className="finding-title">
                  No findings — nothing matched the advisory database.
                </p>
              ) : (
                <ul className="findings">
                  {scan.findings.map((f, i) => (
                    <li key={`${f.advisoryId}-${i}`} data-testid="finding" className="finding">
                      <div className="finding-top">
                        <span className="pkg">
                          {f.package}@{f.version}
                        </span>
                        <span className={`chip ${sevClass(f.severity)}`}>{f.severity}</span>
                        <span className="tag">{f.direct ? 'direct' : 'transitive'}</span>
                      </div>
                      <div className="finding-title">
                        <span className="aid">{f.advisoryId}</span> — {f.title}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
