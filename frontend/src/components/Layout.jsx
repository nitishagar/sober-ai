import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="logo">SoberAI</div>
          <nav className="nav">
            <Link to="/">Dashboard</Link>
            <Link to="/audit">Audit</Link>
            <Link to="/reports">Reports</Link>
            <Link to="/settings">Settings</Link>
          </nav>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
