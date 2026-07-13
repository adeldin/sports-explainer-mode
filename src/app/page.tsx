import type { Metadata } from 'next';
import Image from 'next/image';

// SportsWise landing page. Deliberately self-contained: NO imports from src/lib or
// src/components (both were the pre-extension prototype and are gone). Styles live in the
// scoped <style> below rather than inline objects, so media queries, :focus-visible and
// prefers-reduced-motion actually work.
//
// A note on the two screenshots: they are finished marketing assets, not raw captures — each
// already carries its own device mockup AND its own baked-in headline ("Your sports, all in one
// place." / "Big tournaments. Explained live."). So this page adds NO extra device frame, and
// its own copy stays distinct from theirs. Their cream backgrounds (#fae8d4 / #f4dcc4) differ
// from each other and from the brand cream, so they're framed as cards rather than bled into
// the page — a seamless edge is impossible and a near-miss would look broken.

export const metadata: Metadata = {
  title: 'SportsWise — Live sports, explained',
  description:
    'A browser extension and iOS app that explains live plays in plain language, at your level — from Rookie to Expert, across every major sport.',
};

const CHROME_URL =
  'https://chromewebstore.google.com/detail/sportswise-sports-explain/hmgjfngifefdcpilnneddeogidddjdmd';
const IOS_URL = 'https://apps.apple.com/us/app/sportswise-watch-ask-why/id6781028656';
// The live Carrd pages — the same ones the extension's settings panel links to. NOT the old
// in-repo /privacy route.
const PRIVACY_URL = 'https://explainer-privacy.sportswise.app/';
const TERMS_URL = 'https://explainer-terms.sportswise.app/';

export default function Home() {
  return (
    <main className="lp">
      <style>{CSS}</style>

      <div className="lp-wrap">
        {/* The logo is the FULL lockup (mark + "Sportswise" wordmark), so it replaces the text
            wordmark rather than sitting beside it — otherwise the name would appear twice.
            Served from a crop of the supplied Sportwise_01.png: the original is a 2000×2001
            square whose artwork occupies only a 1416×266 band (13% of the height), so at
            header size the raw file would have rendered the mark ~5px tall. */}
        <header className="lp-head">
          <Image
            className="lp-logo"
            src="/sportswise-logo.png"
            alt="SportsWise"
            width={1416}
            height={266}
            priority
          />
          <span className="lp-kicker">Watch and ask why.</span>
        </header>

        <h1 className="lp-h1">
          Watch any game.
          <br />
          <span className="lp-h1-accent">Understand every play.</span>
        </h1>

        <p className="lp-sub">
          A browser extension and iOS app that explains live plays in plain language — at your
          level, from Rookie to Expert, across every major sport.
        </p>

        <div className="lp-cta">
          <a className="lp-btn lp-btn-primary" href={CHROME_URL} target="_blank" rel="noopener noreferrer">
            Add to Chrome
          </a>
          <a className="lp-btn lp-btn-ghost" href={IOS_URL} target="_blank" rel="noopener noreferrer">
            Also on iOS
          </a>
        </div>

        {/* Hero — the extension explaining a live MLB play. 1280×800 landscape. */}
        <figure className="lp-shot lp-shot-hero">
          <Image
            src="/chromescreenshot.jpg"
            alt="The SportsWise overlay on a live Blue Jays–Giants broadcast, explaining a high fastball that produced a swinging strikeout, with a why-it-matters note and an ask-a-follow-up box."
            width={1280}
            height={800}
            priority
            sizes="(max-width: 900px) 100vw, 960px"
          />
        </figure>

        {/* Secondary — the iOS app. 1284×2778 portrait, so it's constrained and lazy-loaded. */}
        <section className="lp-ios">
          <div className="lp-ios-copy">
            <h2 className="lp-h2">On your phone, too.</h2>
            <p className="lp-sub lp-sub-tight">
              Follow tennis, soccer, cricket, golf and more — live explanations, a coach&apos;s read
              on the situation, and an academy to learn the game.
            </p>
            <a className="lp-btn lp-btn-ghost" href={IOS_URL} target="_blank" rel="noopener noreferrer">
              Download on the App Store
            </a>
          </div>
          <figure className="lp-shot lp-shot-ios">
            <Image
              src="/appscreenshot.png"
              alt="The SportsWise iOS app on two iPhones: a live tennis match explained set by set, and a World Cup foul explained with why it matters."
              width={1284}
              height={2778}
              loading="lazy"
              sizes="(max-width: 900px) 70vw, 340px"
            />
          </figure>
        </section>

        <footer className="lp-foot">
          <nav className="lp-foot-links">
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
              Privacy
            </a>
            <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
              Terms
            </a>
          </nav>
          <span className="lp-foot-c">© 2026 SportsWise</span>
        </footer>
      </div>
    </main>
  );
}

// Brand tokens: navy #0d1b3e, orange #e87722, cream #f5ecd7, muted #a9b4c9.
// One bold move only — the display type + the orange accent. Everything else stays quiet.
const CSS = `
.lp {
  --navy: #0d1b3e;
  --navy-lift: #142a5c;
  --orange: #e87722;
  --cream: #f5ecd7;
  --muted: #a9b4c9;
  background: var(--navy);
  color: var(--cream);
  min-height: 100%;
  flex: 1;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lp-wrap {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 24px 56px;
}

/* Logo lockup + tagline. Height-driven; width follows the 1416:266 ratio (auto), and the
   intrinsic width/height on the <img> reserves the box, so there's no layout shift. */
.lp-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 64px; }
.lp-logo { height: 36px; width: auto; }
.lp-kicker { font-size: 13px; color: var(--muted); }

.lp-h1 {
  font-size: clamp(38px, 7vw, 68px);
  line-height: 1.03;
  letter-spacing: -0.035em;
  font-weight: 800;
  margin: 0 0 20px;
  text-wrap: balance;
}
.lp-h1-accent { color: var(--orange); }

.lp-sub {
  max-width: 56ch;
  font-size: clamp(15px, 1.6vw, 18px);
  line-height: 1.6;
  color: var(--muted);
  margin: 0 0 32px;
  text-wrap: pretty;
}
.lp-sub-tight { margin-bottom: 24px; }

.lp-cta { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 64px; }
.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;              /* tap target */
  padding: 0 22px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.lp-btn-primary { background: var(--orange); color: #fff; }
.lp-btn-primary:hover { background: #d9661f; }
.lp-btn-ghost { color: var(--cream); border: 1px solid #2a3d63; }
.lp-btn-ghost:hover { border-color: var(--muted); background: var(--navy-lift); }
.lp-btn:focus-visible { outline: 3px solid var(--orange); outline-offset: 3px; }
.lp-foot-links a:focus-visible { outline: 3px solid var(--orange); outline-offset: 3px; border-radius: 4px; }

/* The shots are cream-background marketing assets — framed as cards, never bled to the page. */
.lp-shot { margin: 0; border-radius: 14px; overflow: hidden; background: #f4dcc4; box-shadow: 0 18px 50px rgba(0,0,0,.42); }
.lp-shot img { display: block; width: 100%; height: auto; }
.lp-shot-hero { aspect-ratio: 1280 / 800; }

.lp-ios {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 48px;
  align-items: center;
  margin-top: 88px;
}
.lp-shot-ios { aspect-ratio: 1284 / 2778; }
.lp-h2 { font-size: clamp(24px, 3vw, 34px); font-weight: 800; letter-spacing: -0.025em; margin: 0 0 14px; }

.lp-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 88px;
  padding-top: 24px;
  border-top: 1px solid #1e2f52;
  font-size: 13px;
  color: var(--muted);
}
.lp-foot-links { display: flex; gap: 20px; }
.lp-foot-links a { color: var(--muted); text-decoration: none; }
.lp-foot-links a:hover { color: var(--cream); text-decoration: underline; }

@media (max-width: 900px) {
  .lp-wrap { padding: 32px 20px 44px; }
  .lp-head { margin-bottom: 44px; }
  .lp-cta { margin-bottom: 44px; }
  .lp-btn { flex: 1 1 auto; }             /* full-width, tap-sized on mobile */
  .lp-ios { grid-template-columns: 1fr; gap: 32px; margin-top: 64px; }
  .lp-shot-ios { max-width: 340px; margin: 0 auto; }
}

@media (prefers-reduced-motion: reduce) {
  .lp * { transition: none !important; animation: none !important; }
}
`;
