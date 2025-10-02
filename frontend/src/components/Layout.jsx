import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="logo">SoberAI</div>
          <nav className="nav">
            <Link to="/">Dashboard</Link>
            <Link to="/audit">Audit</Link>
            <Link to="/reports">Reports</Link>
          </nav>
          <div className="user-section">
            <span className="user-email text-secondary">{user?.email}</span>
            <span className="plan-badge">{user?.plan}</span>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
