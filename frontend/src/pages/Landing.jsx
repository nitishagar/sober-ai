import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const REPO_URL = 'https://github.com/nitishagar/sober-ai';
const DOCS_URL = 'https://nitishagar.github.io/sober-ai';
const RELEASES_URL = 'https://github.com/nitishagar/sober-ai/releases';

// The 5 audit categories the live app scores. Single source of truth shared
// with README + docs (Phase 4 reconciles the docs' 4→5 mismatch).
const FEATURES = [
  {
    key: 'ssr',
    name: 'SSR Readiness',
    weight: '25%',
    checks: 'Can AI crawlers read your rendered HTML, or just a blank shell?',
  },
  {
    key: 'schema',
    name: 'Schema Coverage',
    weight: '20%',
    checks: 'Structured-data completeness for entities, articles, products.',
  },
  {
    key: 'semantic',
    name: 'Semantic Structure',
    weight: '20%',
    checks: 'Landmarks, headings, and meaning machines can navigate.',
  },
  {
    key: 'content',
    name: 'Content Extractability',
    weight: '20%',
    checks: 'Main content isolates cleanly from chrome and boilerplate.',
  },
  {
    key: 'machine-readability',
    name: 'Machine Readability',
    weight: '20%',
    checks: 'robots.txt, sitemap, and crawl signals for AI user-agents.',
  },
];

const STEPS = [
  { n: '01', title: 'Enter a URL', body: 'Paste any public URL. No login, no agent, no key required to start.' },
  { n: '02', title: 'Real-time audit', body: 'A streaming pipeline gathers render, schema, semantic, and crawl signals.' },
  { n: '03', title: 'Scored report', body: 'A weighted 0–100 score across five categories, with prioritized fixes.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-wordmark">
          <span className="landing-wordmark-bracket">[</span>sober<span className="landing-wordmark-accent">_</span>ai<span className="landing-wordmark-bracket">]</span>
        </div>
        <nav className="landing-nav" aria-label="Landing">
          <a href={DOCS_URL}>Docs</a>
          <a href={REPO_URL}>GitHub</a>
          <a href={RELEASES_URL}>Releases</a>
          <Link to="/app" className="landing-nav-cta">Open the app →</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <p className="landing-eyebrow"><span className="landing-prompt">$</span> audit --for-the-ai-age</p>
          <h1 className="landing-title">
            Lighthouse<span className="landing-title-accent">.</span><br />
            for the AI age.
          </h1>
          <p className="landing-tagline">
            SoberAI scores how readable your site is to machines — crawlers,
            agents, and models — across five categories that actually move the
            needle. Open source. Local-first. No telemetry.
          </p>

          <div className="landing-terminal" role="img" aria-label="Quick start command">
            <div className="landing-terminal-bar">
              <span className="landing-terminal-dot" />
              <span className="landing-terminal-dot" />
              <span className="landing-terminal-dot" />
              <span className="landing-terminal-title">bash</span>
            </div>
            <pre className="landing-terminal-body">
              <code>$ git clone {REPO_URL}{'\n'}
$ cd sober-ai{'\n'}
$ npm install &amp;&amp; npm run electron:dev</code>
            </pre>
          </div>

          <div className="landing-cta-row">
            <Link to="/app" className="landing-cta landing-cta-primary">
              Open the app <span aria-hidden="true">→</span>
            </Link>
            <a href={REPO_URL} className="landing-cta landing-cta-secondary">
              View on GitHub
            </a>
            <a href={RELEASES_URL} className="landing-cta landing-cta-secondary">
              Releases
            </a>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="features-heading">
          <h2 id="features-heading" className="landing-section-title">
            <span className="landing-prompt">#</span> What we score
          </h2>
          <p className="landing-section-sub">
            Five categories, weighted into a 0–100 overall score — the same
            score the live app computes.
          </p>
          <div className="landing-bento">
            {FEATURES.map((f, i) => (
              <article key={f.key} className="landing-card" style={{ '--card-i': i }}>
                <div className="landing-card-head">
                  <span className="landing-card-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="landing-card-weight">{f.weight}</span>
                </div>
                <h3 className="landing-card-name">{f.name}</h3>
                <p className="landing-card-checks">{f.checks}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section" aria-labelledby="how-heading">
          <h2 id="how-heading" className="landing-section-title">
            <span className="landing-prompt">#</span> How it works
          </h2>
          <ol className="landing-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="landing-step">
                <span className="landing-step-n">{s.n}</span>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-body">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-wordmark-bracket">[</span>sober<span className="landing-wordmark-accent">_</span>ai<span className="landing-wordmark-bracket">]</span>
            <span className="landing-footer-license">MIT licensed · built for the crawlable web</span>
          </div>
          <nav className="landing-footer-nav" aria-label="Footer">
            <Link to="/app">Open the app</Link>
            <a href={DOCS_URL}>Docs</a>
            <a href={REPO_URL}>GitHub</a>
            <a href={RELEASES_URL}>Releases</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
