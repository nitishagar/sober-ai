import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="card notfound-card">
        <h1>404</h1>
        <p>Page not found</p>
        <p className="text-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="notfound-home-link">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
