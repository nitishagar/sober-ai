const mockPage = {
  goto: jest.fn().mockResolvedValue(undefined)
};

const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage)
};

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined)
};

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue(mockBrowser)
  }
}));

const mockGatherResults = {
  ssr: { ssr_readiness_score: 75 },
  structuredData: { detected_industry: 'saas', schemaCount: 3 },
  semanticHTML: { semantics: true },
  contentAnalysis: { content: true }
};

jest.mock('../../src/gatherers/ssr-detection', () => {
  return jest.fn().mockImplementation(() => ({
    gather: jest.fn().mockResolvedValue(mockGatherResults.ssr)
  }));
});

jest.mock('../../src/gatherers/structured-data', () => {
  return jest.fn().mockImplementation(() => ({
    gather: jest.fn().mockResolvedValue(mockGatherResults.structuredData)
  }));
});

jest.mock('../../src/gatherers/semantic-html', () => {
  return jest.fn().mockImplementation(() => ({
    gather: jest.fn().mockResolvedValue(mockGatherResults.semanticHTML)
  }));
});

jest.mock('../../src/gatherers/content-analysis', () => {
  return jest.fn().mockImplementation(() => ({
    gather: jest.fn().mockResolvedValue(mockGatherResults.contentAnalysis)
  }));
});

const auditResults = {
  ssrReadiness: { score: 70, severity: 'warning', findings: [] },
  schemaCoverage: { score: 95, severity: 'pass', findings: [] },
  semanticStructure: { score: 90, severity: 'pass', findings: [] },
  contentExtractability: { score: 92, severity: 'pass', findings: [] }
};

jest.mock('../../src/audits/ssr-readiness.audit', () => {
  return jest.fn().mockImplementation(() => ({ audit: jest.fn(() => auditResults.ssrReadiness) }));
});

jest.mock('../../src/audits/schema-coverage.audit', () => {
  return jest.fn().mockImplementation(() => ({ audit: jest.fn(() => auditResults.schemaCoverage) }));
});

jest.mock('../../src/audits/semantic-structure.audit', () => {
  return jest.fn().mockImplementation(() => ({ audit: jest.fn(() => auditResults.semanticStructure) }));
});

jest.mock('../../src/audits/content-extractability.audit', () => {
  return jest.fn().mockImplementation(() => ({ audit: jest.fn(() => auditResults.contentExtractability) }));
});

const llmAnalyzeMock = jest.fn(async (_result, _type, onProgress) => {
  for (let i = 0; i < 10; i++) {
    onProgress('token');
  }
  return { summary: 'ok', recommendations: [{ title: 'x' }] };
});

jest.mock('../../src/llm/analyzer', () => {
  return jest.fn().mockImplementation(() => ({
    analyze: llmAnalyzeMock
  }));
});

jest.mock('../../src/core/scorer', () => {
  return jest.fn().mockImplementation(() => ({
    calculate: jest.fn(() => ({ overall: 80, grade: 'B' }))
  }));
});

const Auditor = require('../../src/core/auditor');

describe('Auditor progress callbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits structured progress phases and llm token callbacks', async () => {
    const auditor = new Auditor({ audits: { weights: {} } });

    const onPhase = jest.fn();
    const onStep = jest.fn();
    const onLLMToken = jest.fn();

    const result = await auditor.audit('https://example.com', { onPhase, onStep, onLLMToken });

    expect(result.metadata.detectedIndustry).toBe('saas');

    expect(onPhase).toHaveBeenCalledWith(1, 'Gathering website data...');
    expect(onPhase).toHaveBeenCalledWith(2, 'Running audits...');
    expect(onPhase).toHaveBeenCalledWith(3, 'Calculating scores...');
    expect(onPhase).toHaveBeenCalledWith(4, 'Generating AI recommendations...');

    const stepMessages = onStep.mock.calls.map((call) => call[0].message);
    expect(stepMessages).toContain('Analyzing server-side rendering...');
    expect(stepMessages).toContain('Generating recommendations for ssrReadiness...');

    expect(onLLMToken).toHaveBeenCalled();
    expect(onLLMToken.mock.calls[0][0]).toBe('ssrReadiness');
    expect(llmAnalyzeMock).toHaveBeenCalledTimes(1);
  });

  it('maintains backwards compatibility with function progress callback signature', async () => {
    const auditor = new Auditor({ audits: { weights: {} } });
    const legacyProgress = jest.fn();

    await auditor.audit('https://example.com', legacyProgress);

    expect(legacyProgress).toHaveBeenCalled();
    expect(legacyProgress.mock.calls[0][0]).toBe('ssrReadiness');
  });
});
