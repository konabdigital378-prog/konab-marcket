import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 32 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--noir)' }}>
              Une erreur est survenue
            </h3>
            <p style={{ color: 'var(--text2)', lineHeight: 1.6, marginBottom: 24, fontSize: 14 }}>
              Désolé, quelque chose s'est mal passé. Rafraîchissez la page ou réessayez.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-rouge" onClick={() => window.location.reload()}>
                🔄 Rafraîchir
              </button>
              <button className="btn btn-outline" onClick={this.handleRetry.bind(this)}>
                Réessayer
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
