import { Component } from 'react';

// Catches render-time errors so a single bad component doesn't blank the page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center">
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              The page hit an unexpected error. Reloading usually fixes it — your saved
              work is safe.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
