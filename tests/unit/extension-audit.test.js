const audit = require('../../extension/lib/audit');

describe('extension/lib/audit', () => {
  describe('normalizeBackendUrl', () => {
    it('defaults to the local backend when empty', () => {
      expect(audit.normalizeBackendUrl('')).toBe('http://localhost:3000');
      expect(audit.normalizeBackendUrl(undefined)).toBe('http://localhost:3000');
    });

    it('trims whitespace and trailing slashes', () => {
      expect(audit.normalizeBackendUrl('  http://127.0.0.1:3100///  '))
        .toBe('http://127.0.0.1:3100');
    });

    it('rejects non-http(s) input instead of re-pointing silently', () => {
      expect(() => audit.normalizeBackendUrl('ftp://x/')).toThrow('http:// or https://');
      expect(() => audit.normalizeBackendUrl('javascript:alert(1)')).toThrow('http:// or https://');
    });
  });

  describe('isLoopbackBackend', () => {
    it('recognizes loopback hosts', () => {
      expect(audit.isLoopbackBackend('http://localhost:3000')).toBe(true);
      expect(audit.isLoopbackBackend('http://127.0.0.1:3100')).toBe(true);
    });

    it('rejects remote hosts and garbage', () => {
      expect(audit.isLoopbackBackend('https://sober.example.com')).toBe(false);
      expect(audit.isLoopbackBackend('not a url')).toBe(false);
    });
  });

  describe('buildAuditHeaders', () => {
    it('returns null when no key is stored', () => {
      expect(audit.buildAuditHeaders({})).toBeNull();
      expect(audit.buildAuditHeaders({ provider: 'openai' })).toBeNull();
    });

    it('builds the X-LLM-* set with provider default', () => {
      expect(audit.buildAuditHeaders({ apiKey: 'k' })).toEqual({
        'X-LLM-API-Key': 'k',
        'X-LLM-Provider': 'openai'
      });
    });

    it('forwards endpoint and model when set', () => {
      expect(audit.buildAuditHeaders({
        apiKey: 'k',
        provider: 'openai',
        endpoint: 'https://integrate.api.nvidia.com/v1',
        model: 'meta/llama-3.1-8b-instruct'
      })).toEqual({
        'X-LLM-API-Key': 'k',
        'X-LLM-Provider': 'openai',
        'X-LLM-Endpoint': 'https://integrate.api.nvidia.com/v1',
        'X-LLM-Model': 'meta/llama-3.1-8b-instruct'
      });
    });
  });

  describe('createSSEParser', () => {
    it('delivers complete events', () => {
      const events = [];
      const parser = audit.createSSEParser((e) => events.push(e));
      parser.push('data: {"status":"started","progress":5}\n\ndata: {"status":"completed","progress":100}\n');
      parser.flush();
      expect(events).toEqual([
        { status: 'started', progress: 5 },
        { status: 'completed', progress: 100 }
      ]);
    });

    it('buffers a data line split across chunks', () => {
      const events = [];
      const parser = audit.createSSEParser((e) => events.push(e));
      parser.push('data: {"status":"proc');
      parser.push('essing","progress":30}\n');
      parser.flush();
      expect(events).toEqual([{ status: 'processing', progress: 30 }]);
    });

    it('ignores malformed lines without throwing', () => {
      const events = [];
      const parser = audit.createSSEParser((e) => events.push(e));
      expect(() => {
        parser.push(': heartbeat\n\ndata: not-json\n\ndata: {"status":"completed"}\n');
        parser.flush();
      }).not.toThrow();
      expect(events).toEqual([{ status: 'completed' }]);
    });
  });
});
