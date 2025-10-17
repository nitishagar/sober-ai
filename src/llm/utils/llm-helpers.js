const sanitizeForJsonValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForJsonValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${sanitizeForJsonValue(val)}`)
      .join(', ');
  }
  return String(value);
};

const sanitizeForJson = (value) => sanitizeForJsonValue(value);

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

module.exports = {
  sanitizeForJson,
  ensureArray
};
