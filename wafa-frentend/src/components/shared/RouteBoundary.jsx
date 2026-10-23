import { Component, Suspense } from 'react';

export default class RouteBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidUpdate(previous) {
    if (previous.routeKey !== this.props.routeKey && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (this.state.failed) return <div role="alert" className="rounded-xl border p-6">
      <p>Impossible de charger cette page.</p>
      <button className="mt-3 underline" onClick={() => window.location.reload()}>Réessayer</button>
    </div>;
    return <Suspense fallback={<div role="status" className="animate-pulse rounded-xl bg-muted p-6">Chargement…</div>}>
      {this.props.children}
    </Suspense>;
  }
}
