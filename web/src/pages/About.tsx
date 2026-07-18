export function About() {
  return (
    <section className="about">
      <div className="avatar" aria-hidden="true">
        CF
      </div>
      <h1>Chen Feldman</h1>
      <p className="brandline">Lead By Nature</p>

      {/* One-line tagline — edit to taste. */}
      <p className="tagline">Technology, led by nature.</p>

      <p className="bio">Creator of OzWizard.</p>

      <a className="cta" href="https://chenfeldman.io" target="_blank" rel="noreferrer">
        chenfeldman.io →
      </a>
    </section>
  );
}
