function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function validateAuditRequest(data) {
  const errors = [];

  if (!data.url) {
    errors.push('URL is required');
  } else if (!isValidUrl(data.url)) {
    errors.push('Invalid URL format');
  }

  if (data.options) {
    if (data.options.timeout && (typeof data.options.timeout !== 'number' || data.options.timeout < 0)) {
      errors.push('Timeout must be a positive number');
    }

    if (data.options.audits && !Array.isArray(data.options.audits)) {
      errors.push('Audits must be an array');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateBatchRequest(data) {
  const errors = [];

  if (!data.urls || !Array.isArray(data.urls)) {
    errors.push('URLs must be an array');
  } else if (data.urls.length === 0) {
    errors.push('At least one URL is required');
  } else if (data.urls.length > 100) {
    errors.push('Maximum 100 URLs per batch');
  } else {
    const invalidUrls = data.urls.filter(url => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      errors.push(`Invalid URLs: ${invalidUrls.slice(0, 5).join(', ')}${invalidUrls.length > 5 ? '...' : ''}`);
    }
  }

  if (data.webhook && !isValidUrl(data.webhook)) {
    errors.push('Invalid webhook URL');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function sanitizeForJson(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForJson(item)).join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${sanitizeForJson(val)}`)
      .join(', ');
  }
  return String(value);
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

module.exports = {
  isValidUrl,
  validateAuditRequest,
  validateBatchRequest,
  sanitizeForJson,
  ensureArray
};
