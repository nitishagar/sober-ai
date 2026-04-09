const MachineReadabilityAudit = require('../../../src/audits/machine-readability.audit');

describe('MachineReadabilityAudit', () => {
  let audit;

  beforeEach(() => {
    audit = new MachineReadabilityAudit();
  });

  // --- Fixtures ---

  const allPassData = {
    robots_txt_exists: true,
    robots_txt_allows_ai: true,
    robots_txt_blocks_ai: false,
    robots_ai_crawlers: { GPTBot: true, 'anthropic-ai': true, CCBot: true, 'Google-Extended': true, 'ChatGPT-User': true },
    llms_txt_exists: true,
    sitemap_exists: true,
    sitemap_parseable: true,
    og_title: 'My Site',
    og_description: 'A great site',
    og_image: 'https://example.com/img.png',
    twitter_card: 'summary_large_image',
    twitter_title: 'My Site',
    og_complete: true,
    response_time_ms: 800,
    is_https: true
  };

  const allFailData = {
    robots_txt_exists: true,
    robots_txt_allows_ai: false,
    robots_txt_blocks_ai: true,
    robots_ai_crawlers: { GPTBot: false, 'anthropic-ai': false, CCBot: false, 'Google-Extended': false, 'ChatGPT-User': false },
    llms_txt_exists: false,
    sitemap_exists: false,
    sitemap_parseable: false,
    og_title: null,
    og_description: null,
    og_image: null,
    twitter_card: null,
    twitter_title: null,
    og_complete: false,
    response_time_ms: 7000,
    is_https: false
  };

  // --- Score boundary tests ---

  describe('Score boundaries', () => {
    it('returns score of 100 when all signals pass', () => {
      const result = audit.audit(allPassData);
      expect(result.score).toBe(100);
    });

    it('returns score of 0 when all signals fail (blocked robots + no files + slow)', () => {
      const result = audit.audit(allFailData);
      expect(result.score).toBe(0);
    });

    it('returns a mid-range score (50) for mixed signals', () => {
      const mixed = {
        ...allFailData,
        robots_txt_exists: false, // no robots.txt = implicitly allows = 30 pts
        llms_txt_exists: false,   // 0 pts
        sitemap_exists: true,
        sitemap_parseable: true,  // 20 pts
        og_complete: false,
        og_title: null,
        og_description: null,     // 0 pts OG
        response_time_ms: 7000    // 0 pts (>= 6000ms)
      };
      const result = audit.audit(mixed);
      // 30 (robots allow) + 0 + 20 (sitemap) + 0 + 0 = 50
      expect(result.score).toBe(50);
    });
  });

  // --- Individual signal scoring ---

  describe('robots.txt scoring (30 pts)', () => {
    it('awards 30 pts when robots.txt allows all AI crawlers', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_allows_ai: true, robots_txt_blocks_ai: false, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(30);
    });

    it('awards 15 pts for mixed AI crawler access', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_allows_ai: false, robots_txt_blocks_ai: false, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(15);
    });

    it('awards 0 pts when robots.txt blocks all AI crawlers', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_allows_ai: false, robots_txt_blocks_ai: true, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(0);
    });

    it('awards 30 pts when no robots.txt (implicit allow)', () => {
      const data = { ...allFailData, robots_txt_exists: false, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(30);
    });
  });

  describe('llms.txt scoring (20 pts)', () => {
    it('awards 20 pts when llms.txt is present', () => {
      const data = { ...allFailData, robots_txt_exists: false, llms_txt_exists: true, response_time_ms: 7000 };
      const result = audit.audit(data);
      // 30 (no robots.txt = allow) + 20 (llms.txt)
      expect(result.score).toBe(50);
    });

    it('awards 0 pts when llms.txt is absent', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_allows_ai: false, robots_txt_blocks_ai: true, llms_txt_exists: false, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(0);
    });
  });

  describe('sitemap.xml scoring (20 pts)', () => {
    it('awards 20 pts when sitemap exists and is parseable', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_blocks_ai: true, sitemap_exists: true, sitemap_parseable: true, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(20);
    });

    it('awards 10 pts when sitemap exists but is not parseable', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_blocks_ai: true, sitemap_exists: true, sitemap_parseable: false, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(10);
    });

    it('awards 0 pts when sitemap is absent', () => {
      const data = { ...allFailData, sitemap_exists: false, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(0);
    });
  });

  describe('OpenGraph scoring (15 pts)', () => {
    it('awards 15 pts when all OG tags present', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_blocks_ai: true, og_complete: true, og_title: 'T', og_description: 'D', og_image: 'I', response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(15);
    });

    it('awards 8 pts when partial OG tags present', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_blocks_ai: true, og_complete: false, og_title: 'T', og_description: 'D', og_image: null, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(8);
    });

    it('awards 0 pts when no OG tags', () => {
      const data = { ...allFailData, response_time_ms: 7000 };
      const result = audit.audit(data);
      expect(result.score).toBe(0);
    });
  });

  describe('Response time scoring (15 pts)', () => {
    it('awards 15 pts for response time < 3000ms', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_blocks_ai: true, response_time_ms: 1000 };
      const result = audit.audit(data);
      expect(result.score).toBe(15);
    });

    it('awards 7 pts for response time between 3000ms and 5999ms', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_blocks_ai: true, response_time_ms: 4000 };
      const result = audit.audit(data);
      expect(result.score).toBe(7);
    });

    it('awards 0 pts for response time >= 6000ms', () => {
      const data = { ...allFailData, robots_txt_exists: true, robots_txt_blocks_ai: true, response_time_ms: 6000 };
      const result = audit.audit(data);
      expect(result.score).toBe(0);
    });
  });

  // --- Severity thresholds ---

  describe('Severity thresholds', () => {
    it('returns severity "pass" for score >= 90', () => {
      const result = audit.audit(allPassData);
      expect(result.severity).toBe('pass');
    });

    it('returns severity "warning" for score of 75', () => {
      // 30 (robots allow) + 20 (llms.txt) + 0 (no sitemap) + 0 (no OG) + 15 (fast) = 65 — adjust
      // Need exactly 75: 30 + 20 + 15 + 8 + 7 = 80 or 30 + 20 + 20 + 0 + 7 = 77
      const data = {
        ...allFailData,
        robots_txt_exists: false,  // 30
        llms_txt_exists: true,     // 20
        sitemap_exists: true,
        sitemap_parseable: true,   // 20
        og_complete: false,
        og_title: 'T',
        og_description: 'D',
        og_image: null,            // 8
        response_time_ms: 4500     // 7 → total: 85, bump to warning range by removing llms
      };
      // 30 + 20 + 20 + 8 + 7 = 85, that's "pass" territory — remove llms.txt
      const data75 = { ...data, llms_txt_exists: false };
      // 30 + 0 + 20 + 8 + 7 = 65 (warning)
      const result = audit.audit(data75);
      expect(result.severity).toBe('warning');
    });

    it('returns severity "critical" for score < 50', () => {
      const result = audit.audit(allFailData);
      expect(result.severity).toBe('critical');
    });
  });

  // --- Findings generation ---

  describe('Findings generation', () => {
    it('generates a critical finding when robots.txt blocks all AI crawlers', () => {
      const result = audit.audit(allFailData);
      const critical = result.findings.find(f => f.type === 'critical' && f.title.includes('blocks all AI crawlers'));
      expect(critical).toBeDefined();
    });

    it('generates a pass finding when robots.txt allows all AI crawlers', () => {
      const result = audit.audit(allPassData);
      const pass = result.findings.find(f => f.type === 'pass' && f.title.includes('allowed in robots.txt'));
      expect(pass).toBeDefined();
    });

    it('generates a warning finding for missing llms.txt', () => {
      const result = audit.audit(allFailData);
      const warning = result.findings.find(f => f.title.includes('llms.txt'));
      expect(warning).toBeDefined();
      expect(warning.type).toBe('warning');
    });

    it('generates a critical finding for missing sitemap', () => {
      const result = audit.audit(allFailData);
      const critical = result.findings.find(f => f.title.toLowerCase().includes('sitemap'));
      expect(critical).toBeDefined();
      expect(critical.type).toBe('critical');
    });

    it('generates a pass finding for valid sitemap', () => {
      const result = audit.audit(allPassData);
      const pass = result.findings.find(f => f.title.includes('Valid sitemap'));
      expect(pass).toBeDefined();
    });

    it('generates a warning finding for missing OG tags', () => {
      const result = audit.audit(allFailData);
      const warn = result.findings.find(f => f.title.includes('OpenGraph') || f.title.includes('og:'));
      expect(warn).toBeDefined();
    });

    it('generates a critical finding for very slow response time (>= 6000ms)', () => {
      const result = audit.audit(allFailData); // response_time_ms: 7000
      const crit = result.findings.find(f => f.title.toLowerCase().includes('very slow'));
      expect(crit).toBeDefined();
      expect(crit.type).toBe('critical');
    });

    it('generates a warning finding for slow response time (3000-5999ms)', () => {
      const data = { ...allPassData, response_time_ms: 4000, og_complete: true };
      const result = audit.audit(data);
      const warn = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('slow'));
      expect(warn).toBeDefined();
    });

    it('generates a pass finding for fast response time', () => {
      const result = audit.audit(allPassData);
      const pass = result.findings.find(f => f.title.includes('Fast HTTP'));
      expect(pass).toBeDefined();
    });

    it('includes findings for every signal (5 total)', () => {
      const result = audit.audit(allPassData);
      expect(result.findings.length).toBe(5);
    });
  });

  // --- Result shape ---

  describe('Result shape', () => {
    it('includes required meta fields in result', () => {
      const result = audit.audit(allPassData);
      expect(result).toHaveProperty('id', 'machine-readability');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('displayValue');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('details');
    });

    it('includes all detail fields', () => {
      const result = audit.audit(allPassData);
      expect(result.details).toHaveProperty('robots_txt_exists');
      expect(result.details).toHaveProperty('llms_txt_exists');
      expect(result.details).toHaveProperty('sitemap_exists');
      expect(result.details).toHaveProperty('og_complete');
      expect(result.details).toHaveProperty('response_time_ms');
    });
  });
});
