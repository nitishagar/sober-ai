/**
 * Get Lighthouse-style color for a score (0-100).
 * 90-100: green, 50-89: orange, 0-49: red
 */
export function getScoreColor(score) {
  if (score >= 90) return 'var(--score-green)';
  if (score >= 50) return 'var(--score-orange)';
  return 'var(--score-red)';
}

/**
 * Get raw hex color for contexts where CSS vars don't work (e.g. SVG).
 */
export function getScoreColorHex(score) {
  if (score >= 90) return '#0cce6b';
  if (score >= 50) return '#ffa400';
  return '#ff4e42';
}

/**
 * Get background color for score badges/cards.
 */
export function getScoreBgColor(score) {
  if (score >= 90) return 'var(--score-green-bg)';
  if (score >= 50) return 'var(--score-orange-bg)';
  return 'var(--score-red-bg)';
}

/**
 * Get CSS class suffix for a score.
 */
export function getScoreClass(score) {
  if (score >= 90) return 'good';
  if (score >= 50) return 'average';
  return 'poor';
}
