import React from 'react';
import './PhaseIndicator.css';

export default function PhaseIndicator({ currentPhase }) {
  const phases = [
    { number: 1, label: 'Gathering', icon: '🔍' },
    { number: 2, label: 'Auditing', icon: '⚙️' },
    { number: 3, label: 'Scoring', icon: '📊' },
    { number: 4, label: 'AI Analysis', icon: '🤖' }
  ];

  return (
    <div className="phase-indicator">
      {phases.map(phase => (
        <div
          key={phase.number}
          className={`phase-step ${
            phase.number < currentPhase ? 'completed' :
            phase.number === currentPhase ? 'active' : 'pending'
          }`}
        >
          <div className="phase-icon">{phase.icon}</div>
          <div className="phase-label">{phase.label}</div>
        </div>
      ))}
    </div>
  );
}
