import React, { useState, useEffect } from 'react';
import { getScoreColorHex } from '../utils/scoreUtils';
import './ScoreGauge.css';

export default function ScoreGauge({ score, label, size = 120 }) {
  const [animated, setAnimated] = useState(false);
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - score / 100);
  const color = getScoreColorHex(score);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setAnimated(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div className="score-gauge" style={{ width: size }}>
      <svg
        viewBox="0 0 120 120"
        className="score-gauge-svg"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className="score-gauge-bg"
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="6"
        />
        {/* Score arc */}
        <circle
          className="score-gauge-arc"
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? targetOffset : circumference}
          transform="rotate(-90 60 60)"
        />
        {/* Score text */}
        <text
          className="score-gauge-text"
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
        >
          {score}
        </text>
      </svg>
      {label && <div className="score-gauge-label">{label}</div>}
    </div>
  );
}
