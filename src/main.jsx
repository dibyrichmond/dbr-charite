import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('ErrorBoundary caught:', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0D0D', color: '#F0F0F0', fontFamily: 'system-ui', padding: 24, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 6, color: '#E8540A', marginBottom: 16 }}>DBR</div>
            <div style={{ fontSize: 16, marginBottom: 12 }}>Une erreur inattendue est survenue.</div>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#E8540A,#C4420A)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Recharger l'application</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
