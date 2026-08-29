import { Link, useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="landing-page">
      <header className="landing-nav container-wide">
        <div className="brand"><span className="brand-mark">CP</span><span>CampusPulse</span></div>
        <nav><a href="#features">Features</a><a href="#how">How it works</a><a href="#about">About</a></nav>
        <div className="landing-actions"><button className="button ghost" onClick={() => navigate('/login')}>Log in</button><button className="button primary" onClick={() => navigate('/signup')}>Get started</button></div>
      </header>
      <section className="hero-section container-wide">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Built for university communities</div>
          <h1>Attendance management that feels <em>effortless.</em></h1>
          <p>CampusPulse helps students check in, representatives manage lectures, and departments keep attendance organized in one clean workspace.</p>
          <div className="hero-actions"><button className="button primary large" onClick={() => navigate('/signup')}>Get started <span>→</span></button><a className="text-link" href="#how">See how it works <span>↗</span></a></div>
          <div className="hero-note"><span className="avatar-stack"><i>A</i><i>B</i><i>C</i></span><span>Designed around the everyday campus routine.</span></div>
        </div>
        <div className="hero-preview">
          <div className="preview-window">
            <div className="preview-top"><span className="traffic"><i/><i/><i/></span><span>campuspulse / dashboard</span><span>•••</span></div>
            <div className="preview-body">
              <div className="preview-side"><div className="preview-logo">CP</div><span className="selected"/><span/><span/><span/><span/></div>
              <div className="preview-main"><div className="preview-line"><div><small>Good morning</small><strong>Your attendance overview</strong></div><div className="preview-avatar">H</div></div><div className="preview-stats"><div><small>Attendance rate</small><b>87%</b><span className="progress"><i style={{width:'87%'}}/></span></div><div><small>Classes attended</small><b>26</b><span className="muted">of 30 sessions</span></div><div><small>Current streak</small><b>6</b><span className="muted">classes</span></div></div><div className="preview-card"><div><small>LIVE SESSION</small><b>CSC 202 · Introduction to Computer Science</b><span>Lecture Hall A · Started 10:02 AM</span></div><button>Check in</button></div><div className="preview-bottom"><div/><div/><div/></div></div>
            </div>
          </div>
        </div>
      </section>
      <section className="trust-row container-wide"><span>Simple enough for students.</span><span>Powerful enough for class reps.</span><span>Structured for departments.</span></section>
      <section id="features" className="section container-wide"><div className="section-heading"><span className="eyebrow">Everything in one place</span><h2>Less admin. More focus.</h2><p>The product is organized around the actual tasks students and representatives perform every week.</p></div><div className="feature-grid"><article><span className="feature-number">01</span><h3>Location-based check-in</h3><p>Students can confirm attendance when they are within the configured lecture radius.</p></article><article><span className="feature-number">02</span><h3>Session management</h3><p>Representatives can create, start, monitor, end and export lecture sessions.</p></article><article><span className="feature-number">03</span><h3>Announcements</h3><p>Keep the class informed without scattering important updates across different chats.</p></article></div></section>
      <section id="how" className="section muted-section"><div className="container-wide"><div className="section-heading"><span className="eyebrow">How it works</span><h2>A simple three-step routine.</h2></div><div className="steps"><div><b>01</b><h3>Create</h3><p>A representative creates a lecture session and sets the attendance radius.</p></div><div><b>02</b><h3>Check in</h3><p>Students open the active session and verify their location before checking in.</p></div><div><b>03</b><h3>Track</h3><p>Attendance records and class activity stay organized for later review.</p></div></div></div></section>
      <section id="about" className="cta-section container-wide"><div><span className="eyebrow">CampusPulse</span><h2>A calmer way to run attendance.</h2><p>Built for the pace of university life, with a focused interface that keeps the important things visible.</p></div><button className="button light large" onClick={() => navigate('/signup')}>Create an account →</button></section>
      <footer className="landing-footer container-wide"><div className="brand"><span className="brand-mark">CP</span><span>CampusPulse</span></div><span className="footer-links"><Link to="/terms">Terms & Conditions</Link><span>© 2026 CampusPulse</span></span></footer>
    </div>
  );
}
export default LandingPage;
