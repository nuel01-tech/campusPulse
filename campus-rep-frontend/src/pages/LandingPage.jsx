import { Link, useNavigate } from "react-router-dom";

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="cp-landing">
      {/* =====================================================
          NAVIGATION
          ===================================================== */}
      <header className="cp-landing-nav">
        <div className="cp-landing-container cp-nav-inner">
          <Link
            to="/"
            className="cp-landing-brand"
            aria-label="CampusPulse home"
          >
            <span className="cp-landing-brand-mark">CP</span>

            <span className="cp-landing-brand-name">CampusPulse</span>
          </Link>

          <nav className="cp-landing-nav-links" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#about">About</a>
          </nav>

          <div className="cp-landing-nav-actions">
            <button
              type="button"
              className="cp-landing-login"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>

            <button
              type="button"
              className="cp-landing-nav-cta"
              onClick={() => navigate("/signup")}
            >
              Get started
              <ArrowIcon />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
          ===================================================== */}
      <main>
        <section className="cp-landing-hero">
          <div className="cp-landing-container cp-hero-grid">
            <div className="cp-hero-copy">
              <div className="cp-hero-kicker">
                <span className="cp-status-dot" />
                Built for the OOU campus community
              </div>

              <h1>
                Attendance management,
                <span> without the paperwork.</span>
              </h1>

              <p className="cp-hero-description">
                CampusPulse gives course representatives and students one
                organized workspace for attendance, announcements, classmates
                and course materials.
              </p>

              <div className="cp-hero-actions">
                <button
                  type="button"
                  className="cp-primary-button"
                  onClick={() => navigate("/signup")}
                >
                  Get started free
                  <ArrowIcon />
                </button>

                <a href="#how" className="cp-hero-secondary-link">
                  See how it works
                  <span aria-hidden="true">↓</span>
                </a>
              </div>

              <div className="cp-hero-proof">
                <div className="cp-proof-avatars" aria-hidden="true">
                  <span>O</span>
                  <span>C</span>
                  <span>S</span>
                </div>

                <div>
                  <strong>Designed around real class routines.</strong>
                  <span>Built for students and course representatives.</span>
                </div>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="cp-hero-visual">
              <div className="cp-dashboard-window">
                <div className="cp-window-header">
                  <div className="cp-window-dots">
                    <span />
                    <span />
                    <span />
                  </div>

                  <span className="cp-window-address">
                    campuspulse / student
                  </span>

                  <span className="cp-window-menu">•••</span>
                </div>

                <div className="cp-dashboard-preview">
                  <aside className="cp-preview-sidebar">
                    <div className="cp-preview-logo">CP</div>

                    <span className="cp-preview-nav active" />
                    <span className="cp-preview-nav" />
                    <span className="cp-preview-nav" />
                    <span className="cp-preview-nav" />
                    <span className="cp-preview-nav" />

                    <span className="cp-preview-sidebar-bottom" />
                  </aside>

                  <div className="cp-preview-content">
                    <div className="cp-preview-topline">
                      <div>
                        <span>Student workspace</span>
                        <strong>Good morning, Hameed</strong>
                      </div>

                      <div className="cp-preview-user">H</div>
                    </div>

                    <div className="cp-preview-stat-grid">
                      <div className="cp-preview-stat">
                        <span>Attendance rate</span>
                        <strong>87%</strong>

                        <div className="cp-preview-progress">
                          <i style={{ width: "87%" }} />
                        </div>

                        <small>Above eligibility threshold</small>
                      </div>

                      <div className="cp-preview-stat">
                        <span>Classes attended</span>
                        <strong>26</strong>
                        <small>of 30 sessions</small>
                      </div>

                      <div className="cp-preview-stat">
                        <span>Current streak</span>
                        <strong>6</strong>
                        <small>consecutive sessions</small>
                      </div>
                    </div>

                    <div className="cp-live-session">
                      <div className="cp-live-session-heading">
                        <span className="cp-live-badge">
                          <i />
                          Live session
                        </span>

                        <span>10:00 AM</span>
                      </div>

                      <div className="cp-live-session-body">
                        <div>
                          <small>CSC 202</small>
                          <strong>Data Structures</strong>
                          <span>Main Auditorium · 120m radius</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate("/signup")}
                        >
                          Check in
                        </button>
                      </div>
                    </div>

                    <div className="cp-preview-lower">
                      <div className="cp-mini-panel">
                        <div className="cp-mini-heading">
                          <span>Announcements</span>
                          <small>View all</small>
                        </div>

                        <div className="cp-mini-row">
                          <span className="cp-mini-dot" />
                          <div>
                            <strong>CSC 202 lecture moved</strong>
                            <small>Posted 18 minutes ago</small>
                          </div>
                        </div>

                        <div className="cp-mini-row">
                          <span className="cp-mini-dot gold" />
                          <div>
                            <strong>Assignment reminder</strong>
                            <small>Posted yesterday</small>
                          </div>
                        </div>
                      </div>

                      <div className="cp-mini-panel cp-mini-progress-panel">
                        <div className="cp-mini-heading">
                          <span>This semester</span>
                        </div>

                        <div className="cp-ring">
                          <span>87%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cp-visual-label cp-visual-label-one">
                <span>01</span>
                GPS verified
              </div>

              <div className="cp-visual-label cp-visual-label-two">
                <span>02</span>
                Live attendance
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            TRUST / PRODUCT CAPABILITIES
            ===================================================== */}
        <section className="cp-capability-strip">
          <div className="cp-landing-container cp-capability-grid">
            <div className="cp-capability-intro">
              <span>One workspace</span>
              <strong>For the whole class.</strong>
            </div>

            <div className="cp-capability-item">
              <span className="cp-capability-icon">01</span>
              <div>
                <strong>GPS verified</strong>
                <span>Location-based check-in</span>
              </div>
            </div>

            <div className="cp-capability-item">
              <span className="cp-capability-icon">02</span>
              <div>
                <strong>Class directory</strong>
                <span>Organized student records</span>
              </div>
            </div>

            <div className="cp-capability-item">
              <span className="cp-capability-icon">03</span>
              <div>
                <strong>Excel export</strong>
                <span>Attendance records on demand</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FEATURES
            ===================================================== */}
        <section
          id="features"
          className="cp-landing-section cp-features-section"
        >
          <div className="cp-landing-container">
            <div className="cp-section-intro">
              <div>
                <span className="cp-section-kicker">
                  <i />
                  What CampusPulse does
                </span>

                <h2>
                  Less administration.
                  <br />
                  Better class coordination.
                </h2>
              </div>

              <p>
                From the moment a course representative opens a session to the
                moment attendance records are exported, CampusPulse keeps the
                workflow organized.
              </p>
            </div>

            <div className="cp-feature-grid">
              <article className="cp-feature-card cp-feature-main">
                <div className="cp-feature-number">01</div>

                <div className="cp-feature-content">
                  <span className="cp-feature-label">Attendance</span>

                  <h3>Location-based check-in</h3>

                  <p>
                    Students check into active lecture sessions from within the
                    configured venue perimeter. Location verification happens as
                    part of the attendance process.
                  </p>

                  <div className="cp-feature-detail">
                    <CheckIcon />
                    GPS-verified sessions
                  </div>
                </div>

                <div className="cp-feature-visual cp-location-visual">
                  <div className="cp-location-map">
                    <span className="cp-map-grid" />

                    <div className="cp-location-radius">
                      <span className="cp-location-point">
                        <i />
                      </span>
                    </div>

                    <span className="cp-location-label">Lecture venue</span>
                  </div>
                </div>
              </article>

              <article className="cp-feature-card">
                <div className="cp-feature-number">02</div>

                <span className="cp-feature-label">Community</span>

                <h3>Classmate directory</h3>

                <p>
                  Students can find classmates while representatives have the
                  tools needed to manage class registration.
                </p>

                <div className="cp-feature-detail">
                  <CheckIcon />
                  Role-based access
                </div>
              </article>

              <article className="cp-feature-card cp-feature-dark">
                <div className="cp-feature-number">03</div>

                <span className="cp-feature-label">Communication</span>

                <h3>Announcements that reach the class.</h3>

                <p>
                  Course representatives can publish important updates without
                  relying on scattered messages.
                </p>

                <div className="cp-announcement-preview">
                  <span className="cp-announcement-line long" />
                  <span className="cp-announcement-line medium" />
                  <span className="cp-announcement-line short" />
                </div>
              </article>

              <article className="cp-feature-card cp-feature-wide">
                <div className="cp-feature-number">04</div>

                <div>
                  <span className="cp-feature-label">Records</span>

                  <h3>Attendance records that stay organized.</h3>

                  <p>
                    Track sessions, review attendance history and export class
                    records when needed.
                  </p>
                </div>

                <div className="cp-record-preview">
                  <div className="cp-record-header">
                    <span>Student</span>
                    <span>Sessions</span>
                    <span>Status</span>
                  </div>

                  <div className="cp-record-row">
                    <span>
                      <i />
                      Student 01
                    </span>
                    <span>28 / 30</span>
                    <b>Eligible</b>
                  </div>

                  <div className="cp-record-row">
                    <span>
                      <i />
                      Student 02
                    </span>
                    <span>25 / 30</span>
                    <b>Eligible</b>
                  </div>

                  <div className="cp-record-row">
                    <span>
                      <i />
                      Student 03
                    </span>
                    <span>18 / 30</span>
                    <em>Review</em>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =====================================================
            HOW IT WORKS
            ===================================================== */}
        <section id="how" className="cp-landing-section cp-how-section">
          <div className="cp-landing-container">
            <div className="cp-how-header">
              <span className="cp-section-kicker">
                <i />
                How it works
              </span>

              <h2>
                A simple routine for
                <br />
                the entire class.
              </h2>

              <p>
                CampusPulse follows the same basic flow every lecture, keeping
                responsibilities clear between representatives and students.
              </p>
            </div>

            <div className="cp-steps">
              <article className="cp-step">
                <div className="cp-step-top">
                  <span>01</span>
                  <i />
                </div>

                <h3>Rep creates a session</h3>

                <p>
                  The course representative starts the session, selects the
                  course and defines the lecture venue and check-in radius.
                </p>
              </article>

              <article className="cp-step">
                <div className="cp-step-top">
                  <span>02</span>
                  <i />
                </div>

                <h3>Students check in</h3>

                <p>
                  Students open the active session and submit their location.
                  CampusPulse verifies that they are within the allowed area.
                </p>
              </article>

              <article className="cp-step">
                <div className="cp-step-top">
                  <span>03</span>
                  <i />
                </div>

                <h3>Records stay organized</h3>

                <p>
                  Attendance becomes part of the class record, with history and
                  export tools available when needed.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =====================================================
            ABOUT / CTA
            ===================================================== */}
        <section id="about" className="cp-landing-cta">
          <div className="cp-landing-container">
            <div className="cp-cta-inner">
              <div>
                <span className="cp-section-kicker cp-section-kicker-light">
                  <i />
                  CampusPulse
                </span>

                <h2>
                  Built around the way
                  <br />
                  university classes actually work.
                </h2>

                <p>
                  A focused digital workspace for attendance, communication and
                  class organization.
                </p>
              </div>

              <button
                type="button"
                className="cp-cta-button"
                onClick={() => navigate("/signup")}
              >
                Create an account
                <ArrowIcon />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================
          FOOTER
          ===================================================== */}
      <footer className="cp-landing-footer">
        <div className="cp-landing-container cp-footer-inner">
          <Link
            to="/"
            className="cp-landing-brand"
            aria-label="CampusPulse home"
          >
            <span className="cp-landing-brand-mark">CP</span>

            <span className="cp-landing-brand-name">CampusPulse</span>
          </Link>

          <div className="cp-footer-right">
            <Link to="/terms">Terms &amp; Conditions</Link>

            <span>© 2026 CampusPulse · All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
