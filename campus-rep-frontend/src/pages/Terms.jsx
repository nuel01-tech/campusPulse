import { Link } from "react-router-dom";

const sections = [
  {
    number: "01",
    title: "Acceptable use",
    body: "CampusPulse is provided for legitimate academic use. Users must provide accurate account information and must not attempt to impersonate another student, manipulate attendance records, or interfere with the service.",
  },
  {
    number: "02",
    title: "Attendance verification",
    body: "Location data may be used during an attendance check-in to verify that a student is within the configured lecture area. A successful check-in is not permission to share or misuse another person's account.",
  },
  {
    number: "03",
    title: "Account security",
    body: "Keep your password and class code private. You are responsible for activity performed through your account. Report suspected unauthorized access promptly.",
  },
  {
    number: "04",
    title: "Notifications",
    body: "CampusPulse may send session, announcement and system notifications according to your preferences and device permissions.",
  },
  {
    number: "05",
    title: "Service availability",
    body: "CampusPulse may be updated, interrupted or changed as the system evolves. Attendance decisions should follow official university procedures where applicable.",
  },
  {
    number: "06",
    title: "Privacy",
    body: "Only the information required to operate your account and academic features should be collected. Location information should be used for attendance verification and handled according to the application's privacy controls.",
  },
  {
    number: "07",
    title: "Changes",
    body: "These terms may be updated as CampusPulse develops. Continued use after an update means you accept the revised terms.",
  },
];

function Terms() {
  return (
    <div className="cp-legal-page">
      <header className="cp-legal-nav">
        <div className="cp-legal-nav-inner">
          <Link to="/" className="cp-legal-brand" aria-label="CampusPulse home">
            <span className="cp-legal-brand-mark">CP</span>

            <span className="cp-legal-brand-name">
              Campus<span>Pulse</span>
            </span>
          </Link>

          <Link to="/signup" className="cp-legal-create">
            Create account
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="cp-legal-main">
        <div className="cp-legal-layout">
          <aside className="cp-legal-sidebar">
            <span className="cp-legal-eyebrow">
              <span />
              Legal
            </span>

            <h1>Terms & Conditions</h1>

            <p className="cp-legal-intro">
              The rules and expectations for using CampusPulse for university
              attendance and academic communication.
            </p>

            <div className="cp-legal-sidebar-note">
              <div className="cp-legal-note-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>

              <div>
                <strong>Use CampusPulse responsibly</strong>
                <span>
                  These guidelines help protect the integrity of attendance
                  records and student accounts.
                </span>
              </div>
            </div>
          </aside>

          <article className="cp-legal-document">
            <div className="cp-legal-document-head">
              <span>CampusPulse · Usage terms</span>
              <span>Updated 2026</span>
            </div>

            <div className="cp-legal-sections">
              {sections.map((section) => (
                <section className="cp-legal-section" key={section.number}>
                  <div className="cp-legal-section-number">
                    {section.number}
                  </div>

                  <div className="cp-legal-section-content">
                    <h2>{section.title}</h2>
                    <p>{section.body}</p>
                  </div>
                </section>
              ))}
            </div>

            <div className="cp-legal-footer">
              <Link to="/" className="cp-legal-back">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back to CampusPulse
              </Link>
            </div>
          </article>
        </div>
      </main>

      <footer className="cp-legal-bottom">
        <div>
          <span>CampusPulse</span>
          <span>Olabisi Onabanjo University</span>
        </div>

        <span>© 2026 CampusPulse</span>
      </footer>
    </div>
  );
}

export default Terms;
