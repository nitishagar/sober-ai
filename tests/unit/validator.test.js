const { isValidUrl, validateAuditRequest, validateBatchRequest } = require('../../src/utils/validator');

describe('Validator', () => {
  describe('isValidUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
      expect(isValidUrl('http://example.com:8080')).toBe(true);
    });

    it('should accept valid HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://sub.example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('validateAuditRequest', () => {
    it('should accept valid audit requests', () => {
      const result = validateAuditRequest({ url: 'https://example.com' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject requests without URL', () => {
      const result = validateAuditRequest({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL is required');
    });

    it('should reject requests with invalid URL', () => {
      const result = validateAuditRequest({ url: 'not a url' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });

    it('should accept valid options', () => {
      const result = validateAuditRequest({
        url: 'https://example.com',
        options: {
          timeout: 30000,
          audits: ['ssr', 'schema']
        }
      });
      expect(result.valid).toBe(true);
    });


    it('should reject zero timeout', () => {
      const result = validateAuditRequest({
        url: 'https://example.com',
        options: { timeout: 0 }
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timeout must be a positive number');
    });
    it('should reject invalid timeout', () => {
      const result = validateAuditRequest({
        url: 'https://example.com',
        options: { timeout: -1 }
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateBatchRequest', () => {
    it('should accept valid batch requests', () => {
      const result = validateBatchRequest({
        urls: ['https://example.com', 'https://example.org']
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject requests without URLs array', () => {
      const result = validateBatchRequest({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URLs must be an array');
    });

    it('should reject empty URLs array', () => {
      const result = validateBatchRequest({ urls: [] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one URL is required');
    });

    it('should reject too many URLs', () => {
      const urls = Array(101).fill('https://example.com');
      const result = validateBatchRequest({ urls });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum 100 URLs per batch');
    });

    it('should reject invalid URLs in batch', () => {
      const result = validateBatchRequest({
        urls: ['https://example.com', 'not a url']
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid URLs');
    });
  });
});
