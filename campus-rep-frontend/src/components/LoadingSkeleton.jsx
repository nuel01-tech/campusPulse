function LoadingSkeleton({ rows = 3, className = "" }) {
  return (
    <div
      className={`cp-skeleton-stack ${className}`}
      role="status"
      aria-label="Loading content"
    >
      <span className="cp-skeleton-visually-hidden">Loading content...</span>

      {Array.from({ length: rows }, (_, index) => (
        <div className="cp-skeleton-row" key={index}>
          <span className="cp-skeleton cp-skeleton-avatar" aria-hidden="true" />

          <span className="cp-skeleton-content">
            <span
              className="cp-skeleton cp-skeleton-line cp-skeleton-medium"
              aria-hidden="true"
            />

            <span
              className="cp-skeleton cp-skeleton-line cp-skeleton-short"
              aria-hidden="true"
            />
          </span>

          <span className="cp-skeleton cp-skeleton-button" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
