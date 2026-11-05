import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="container narrow center-page">
      <h1>Page not found</h1>
      <p className="muted">The link may be mistyped or out of date.</p>
      <Link to="/" className="btn btn-secondary btn-md">
        <span>Go to start</span>
      </Link>
    </div>
  );
}
