import { Link, useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="landing-nav container-wide">
        <div className="brand">
          <span className="brand-mark">CP</span>
          <span>CampusPulse</span>
        </div>
        <nav>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#about">About</a>
        </nav>
        <div className="landing-actions">
          <button className="button ghost" onClick={() => navigate('/login')}>
            Log in
          </button>
          <button className="button primary" onClick={() => navigate('/signup')}>
            Get started
          </button>
        </div>
      </header>

      <section className="hero-section container-wide">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> Built for OOU campus community
          </div>
          <h1>
            Attendance management that feels <em>effortless.</em>
          </h1>
          <p>
            CampusPulse empowers students to verify attendance with GPS accuracy, lets course representatives coordinate lectures and classmates, and keeps class records strictly organized in one clean workspace.
          </p>
          <div className="hero-actions">
            <button className="button primary large" onClick={() => navigate('/signup')}>
              Get started free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <a className="text-link" href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              See how it works
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </div>
          <div className="hero-note">
            <span className="avatar-stack">
              <i>A</i>
              <i>B</i>
              <i>C</i>
            </span>
            <span>Used by hundreds of students across faculty departments daily.</span>
          </div>
        </div>

        <div className="hero-preview">
          <div className="preview-window">
            <div className="preview-top">
              <span className="traffic">
                <i />
                <i />
                <i />
              </span>
              <span>campuspulse.app / dashboard</span>
              <span style={{ opacity: 0.5 }}>•••</span>
            </div>
            <div className="preview-body">
              <div className="preview-side">
                <div className="preview-logo">CP</div>
                <span className="selected" />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="preview-main">
                <div className="preview-line">
                  <div>
                    <small>Good morning</small>
                    <strong>Your attendance overview</strong>
                  </div>
                  <div className="preview-avatar">H</div>
                </div>

                <div className="preview-stats">
                  <div>
                    <small>Attendance rate</small>
                    <b>87%</b>
                    <span className="progress">
                      <i style={{ width: '87%' }} />
                    </span>
                  </div>
                  <div>
                    <small>Classes attended</small>
                    <b>26</b>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>of 30 sessions</span>
                  </div>
                  <div>
                    <small>Current streak</small>
                    <b>6</b>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>consecutive</span>
                  </div>
                </div>

                <div className="preview-card">
                  <div>
                    <small>● LIVE LECTURE SESSION</small>
                    <b>CSC 202 · Data Structures</b>
                    <span>Main Auditorium · Started 10:00 AM</span>
                  </div>
                  <button onClick={() => navigate('/signup')}>Check in</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-row container-wide">
        <span>📍 Geolocation Verified Check-in</span>
        <span>👥 Role-Based Classmate Directory</span>
        <span>📊 Instant Excel Attendance Export</span>
      </section>

      <section id="features" className="section container-wide">
        <div className="section-heading">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> Everything in one place
          </span>
          <h2>Less admin hassle. More focus on study.</h2>
          <p>
            CampusPulse replaces cumbersome paper sheets with location-verified digital attendance, fast broadcast announcements, and student management.
          </p>
        </div>

        <div className="feature-grid">
          <article>
            <span className="feature-number">01</span>
            <h3>Location-based check-in</h3>
            <p>Students verify attendance directly within the lecturer&apos;s physical perimeter with high-accuracy GPS coordinates.</p>
          </article>
          <article>
            <span className="feature-number">02</span>
            <h3>Course Rep Classmates Directory</h3>
            <p>Reps can contact classmates via WhatsApp DM, monitor registration statuses, suspend inactive accounts, and purge accidental duplicates.</p>
          </article>
          <article>
            <span className="feature-number">03</span>
            <h3>Broadcast Announcements</h3>
            <p>Course reps send announcements and lecture notes that push instantly to all students in the class without noise.</p>
          </article>
        </div>
      </section>

      <section id="how" className="section muted-section">
        <div className="container-wide">
          <div className="section-heading">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> How it works
            </span>
            <h2>A seamless routine for the entire class.</h2>
          </div>
          <div className="steps">
            <div>
              <b>01</b>
              <h3>Rep creates session</h3>
              <p>The Course Rep starts the session at the lecture venue and defines the check-in radius.</p>
            </div>
            <div>
              <b>02</b>
              <h3>Students check in</h3>
              <p>Students tap check-in with one click; location is verified within seconds.</p>
            </div>
            <div>
              <b>03</b>
              <h3>Records &amp; Class Directory</h3>
              <p>Course attendance is computed in real time and available for one-click Excel download.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="cta-section container-wide">
        <div>
          <span className="eyebrow light">
            <span className="eyebrow-dot" /> CampusPulse
          </span>
          <h2>A smarter way to run attendance.</h2>
          <p>Built for the pace of university lectures, with a clean and focused interface.</p>
        </div>
        <button className="button light large" onClick={() => navigate('/signup')}>
          Create an account
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </section>

      <footer className="landing-footer container-wide">
        <div className="brand">
          <span className="brand-mark">CP</span>
          <span>CampusPulse</span>
        </div>
        <span className="footer-links">
          <Link to="/terms">Terms &amp; Conditions</Link>
          <span>© 2026 CampusPulse · All rights reserved.</span>
        </span>
      </footer>
    </div>
  );
}

export default LandingPage;
