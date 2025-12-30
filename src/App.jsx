/**
 * App.jsx
 * Main application with routing
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/common/Header.jsx';

// Lazy load pages for better performance
const RagaQuery = React.lazy(() => import('./pages/RagaQuery.jsx'));
const RagaInsights = React.lazy(() => import('./pages/RagaInsights.jsx'));
const ChordTool = React.lazy(() => import('./pages/ChordTool.jsx'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#000000] text-[#e2e8f0]">
        <Header />

        <main className="pt-2">
          <React.Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<ChordTool />} />
              <Route path="/app.html" element={<ChordTool />} />
              <Route path="/query" element={<RagaQuery />} />
              <Route path="/insights" element={<RagaInsights />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
