import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Audit from './pages/Audit';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Compare from './pages/Compare';
import Landing from './pages/Landing';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="audit" element={<Audit />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="compare/:id1/:id2" element={<Compare />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Top-level catch-all: renders the branded 404 for any path that is
            neither "/" nor under "/app" (e.g. "/no-such-page"). Required by
            IMPLICIT_SPEC BA-3 (marketing-site 404). The nested "*" under
            "/app" still catches "/app/<unknown>". */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
