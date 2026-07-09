const logger = require('../../src/utils/logger');

// Map a logger level to the underlying console method it writes to.
const LEVEL_TO_CONSOLE = {
  trace: 'trace',
  debug: 'debug',
  info: 'log',
  warn: 'warn',
  error: 'error'
};

// Capture console output for a given logger level so we can assert on the formatted string.
function captureLevel(level) {
  const calls = [];
  const spy = jest.spyOn(console, LEVEL_TO_CONSOLE[level] || 'log').mockImplementation((...args) => {
    calls.push(args.join(' '));
  });
  return { spy, calls };
}

describe('logger secret redaction (invariant C)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts Authorization header from an axios-shaped error object', () => {
    const { spy, calls } = captureLevel('error');
    const FAKE_KEY = 'leaked-secret-value-here';
    const axiosError = {
      config: { headers: { Authorization: `Bearer ${FAKE_KEY}` } },
      message: 'Request failed with status 401'
    };

    logger.error('Audit failed:', axiosError);

    expect(spy).toHaveBeenCalledTimes(1);
    const output = calls[0];
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain(FAKE_KEY);
    // Non-secret context survives
    expect(output).toContain('Request failed with status 401');
    expect(output).toContain('Audit failed');
  });

  it('masks a raw "Bearer <token>" in a string message/arg', () => {
    const { calls } = captureLevel('info');
    const FAKE_KEY = 'leaked-masked-value-here';
    logger.info('Using key', `Bearer ${FAKE_KEY}`);
    const output = calls[0];
    expect(output).not.toContain(FAKE_KEY);
    expect(output).toContain('Bearer [REDACTED]');
  });

  it('redacts lowercase apiKey / api_key / x-llm-api-key keys', () => {
    const { calls } = captureLevel('warn');
    const FAKE_A = 'leakedvalue-aaa';
    const FAKE_B = 'leakedvalue-bbb';
    const FAKE_C = 'leakedvalue-ccc';
    logger.warn('provider config', {
      apiKey: FAKE_A,
      api_key: FAKE_B,
      'x-llm-api-key': FAKE_C,
      provider: 'openai',
      endpoint: 'https://integrate.api.nvidia.com/v1',
      model: 'gpt-4o-mini'
    });
    const output = calls[0];
    expect(output).not.toContain(FAKE_A);
    expect(output).not.toContain(FAKE_B);
    expect(output).not.toContain(FAKE_C);
    expect(output).toContain('"apiKey":"[REDACTED]"');
    expect(output).toContain('"api_key":"[REDACTED]"');
    expect(output).toContain('"x-llm-api-key":"[REDACTED]"');
  });

  it('does NOT redact the endpoint (x-llm-endpoint is not a secret)', () => {
    const { calls } = captureLevel('info');
    logger.info('config', { 'x-llm-endpoint': 'https://integrate.api.nvidia.com/v1' });
    expect(calls[0]).toContain('https://integrate.api.nvidia.com/v1');
  });

  it('preserves non-secret object fields intact (no over-redaction)', () => {
    const { calls } = captureLevel('info');
    logger.info('session', {
      provider: 'openai',
      model: 'meta/llama-3.1-8b-instruct',
      phase: 4,
      progress: 42,
      nested: { status: 'processing', retries: 2 }
    });
    const output = calls[0];
    expect(output).toContain('"provider":"openai"');
    expect(output).toContain('"model":"meta/llama-3.1-8b-instruct"');
    expect(output).toContain('"phase":4');
    expect(output).toContain('"progress":42');
    expect(output).toContain('"status":"processing"');
    expect(output).toContain('"retries":2');
  });

  it('does not throw on circular references', () => {
    const { calls } = captureLevel('error');
    const FAKE_KEY = 'leaked-circular-value-999';
    const a = { name: 'a' };
    a.self = a; // circular
    a.config = { headers: { Authorization: `Bearer ${FAKE_KEY}` } };

    expect(() => logger.error('circular test', a)).not.toThrow();
    expect(calls[0]).not.toContain(FAKE_KEY);
    expect(calls[0]).toContain('[Circular]');
  });

  it('redacts secrets inside arrays', () => {
    const { calls } = captureLevel('info');
    const FAKE_ARR = 'leakedarrayvalue';
    logger.info('history', [{ apiKey: FAKE_ARR }, { ok: true }]);
    const output = calls[0];
    expect(output).not.toContain(FAKE_ARR);
    expect(output).toContain('"ok":true');
  });

  it('handles password and token keys case-insensitively', () => {
    const { calls } = captureLevel('error');
    const FAKE_PW = 'leakedpassword';
    const FAKE_TOK = 'leakedtokenval';
    logger.error('auth', { Password: FAKE_PW, TOKEN: FAKE_TOK });
    const output = calls[0];
    expect(output).not.toContain(FAKE_PW);
    expect(output).not.toContain(FAKE_TOK);
    expect(output).toContain('[REDACTED]');
  });
});
