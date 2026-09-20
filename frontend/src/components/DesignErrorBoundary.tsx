'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/runtime errors inside the studio.
 *
 * The point is what it *doesn't* do: it never navigates away. A thrown
 * error used to bubble up and end with the customer on the marketing page
 * with their design gone. Holding the route and showing the actual message
 * means the work is still in localStorage and a reload brings it back.
 */
export class DesignErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Design studio error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-lg mx-auto px-sp-3 py-sp-6 text-center space-y-sp-3">
        <h2 className="font-serif text-2xl text-ink">Something in the studio broke.</h2>
        <p className="text-sm text-secondary">
          Your design is saved locally — reloading this page should bring it back exactly as it was.
        </p>
        <pre className="text-[11px] text-left text-secondary bg-surface-subtle border border-hairline rounded-lg p-3 overflow-x-auto">
          {error.message}
        </pre>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2.5 rounded-full border border-hairline text-secondary text-xs font-semibold uppercase tracking-wider"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-ink hover:bg-black text-white text-xs font-semibold uppercase tracking-wider"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
