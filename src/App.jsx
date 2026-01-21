import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ChordTool from './pages/ChordTool';
import QueryTool from './pages/QueryTool';
import Insights from './pages/Insights';

// Error Boundary to catch silent errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'white', background: '#1e1e1e', minHeight: '100vh' }}>
          <h1 style={{ color: '#ff4444' }}>Something went wrong</h1>
          <pre style={{ textAlign: 'left', background: '#333', padding: '20px', borderRadius: '8px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            {'\n\n'}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  console.log("App component rendering");
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen p-6">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<ChordTool />} />
              <Route path="/query" element={<QueryTool />} />
              <Route path="/insights" element={<Insights />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
