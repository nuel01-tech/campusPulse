import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  failed: boolean;
}

/** Last line of defence: catches render errors so the page never goes blank. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="container narrow center-page">
        <h1>Something broke on this page</h1>
        <p className="muted">Reloading usually fixes it. Your attendance records are safe.</p>
        <button className="btn btn-primary btn-md" onClick={() => window.location.reload()}>
          <span>Reload</span>
        </button>
      </main>
    );
  }
}
