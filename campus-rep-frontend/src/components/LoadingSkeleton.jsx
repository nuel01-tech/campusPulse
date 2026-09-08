function LoadingSkeleton({ rows = 3, className = '' }) {
  return (
    <div className={`skeleton-stack ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton skeleton-avatar" />
          <span>
            <span className="skeleton skeleton-line medium" />
            <span className="skeleton skeleton-line short" />
          </span>
          <span className="skeleton skeleton-button" />
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
