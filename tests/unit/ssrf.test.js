const dns = require('dns');
const { isPrivateTarget, isPrivateIp } = require('../../src/utils/ssrf');

jest.mock('dns', () => ({
  ...jest.requireActual('dns'),
  promises: {
    lookup: jest.fn()
  }
}));

describe('isPrivateIp', () => {
  it('flags IPv4 private ranges', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('10.255.255.255')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true); // cloud metadata
    expect(isPrivateIp('0.0.0.0')).toBe(true);
  });

  it('does NOT flag public IPv4 addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('172.32.0.1')).toBe(false); // just outside 172.16/12
    expect(isPrivateIp('172.15.0.1')).toBe(false);
  });

  it('flags IPv6 loopback and private ranges', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true); // unique local
    expect(isPrivateIp('fd12:3456::1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true); // link-local
  });

  it('does NOT flag public IPv6 addresses', () => {
    expect(isPrivateIp('2606:4700:4700::1111')).toBe(false); // Cloudflare
  });
});

describe('isPrivateTarget (invariant I)', () => {
  const originalSsrf = process.env.SSRF_BLOCK_PRIVATE;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalSsrf === undefined) delete process.env.SSRF_BLOCK_PRIVATE;
    else process.env.SSRF_BLOCK_PRIVATE = originalSsrf;
  });

  beforeEach(() => {
    delete process.env.SSRF_BLOCK_PRIVATE; // default ON
  });

  it('blocks a literal private IP URL (cloud metadata endpoint)', async () => {
    const r = await isPrivateTarget('http://169.254.169.254/latest/meta-data/');
    expect(r.blocked).toBe(true);
    expect(r.reason).toContain('169.254.169.254');
  });

  it('blocks http://10.0.0.1/', async () => {
    const r = await isPrivateTarget('http://10.0.0.1/');
    expect(r.blocked).toBe(true);
  });

  it('blocks http://localhost/ (resolves to loopback)', async () => {
    dns.promises.lookup.mockResolvedValue([
      { address: '127.0.0.1', family: 4 },
      { address: '::1', family: 6 }
    ]);
    const r = await isPrivateTarget('http://localhost/');
    expect(r.blocked).toBe(true);
  });

  it('rejects if ANY resolved IP is private (DNS rebinding defense)', async () => {
    dns.promises.lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 }, // public
      { address: '10.0.0.5', family: 4 }        // private
    ]);
    const r = await isPrivateTarget('http://rebinding.example.com/');
    expect(r.blocked).toBe(true);
    expect(r.reason).toContain('10.0.0.5');
  });

  it('accepts a public hostname (all resolved IPs public)', async () => {
    dns.promises.lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 }
    ]);
    const r = await isPrivateTarget('http://example.com/');
    expect(r.blocked).toBe(false);
  });

  it('lets DNS failure pass through (downstream audit reports it)', async () => {
    dns.promises.lookup.mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }));
    const r = await isPrivateTarget('http://does-not-resolve.invalid/');
    expect(r.blocked).toBe(false);
  });

  it('is disabled when SSRF_BLOCK_PRIVATE=0 (local dev with internal audits)', async () => {
    process.env.SSRF_BLOCK_PRIVATE = '0';
    const r = await isPrivateTarget('http://169.254.169.254/');
    expect(r.blocked).toBe(false);
  });
});
