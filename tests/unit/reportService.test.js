// Mock PrismaClient before requiring the service. reportService.js instantiates
// `new PrismaClient()` at module load, so the mock must be in place first.
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    report: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      count: mockCount
    }
  }))
}));

const reportService = require('../../src/services/reportService');

// A full-row Report shape (mirrors schema.prisma Report model). compareReports
// relies on getReport returning the full row incl. all 5 category scores.
function makeReport(overrides = {}) {
  return {
    id: overrides.id || 'rpt-1',
    url: overrides.url || 'https://example.com',
    overallScore: overrides.overallScore ?? 50,
    grade: overrides.grade || 'C',
    ssrScore: overrides.ssrScore ?? 50,
    schemaScore: overrides.schemaScore ?? 50,
    semanticScore: overrides.semanticScore ?? 50,
    contentScore: overrides.contentScore ?? 50,
    machineReadabilityScore: overrides.machineReadabilityScore ?? 0,
    detectedIndustry: overrides.detectedIndustry || 'unknown',
    duration: overrides.duration ?? 1000,
    auditResults: '{}',
    recommendations: null,
    ownerToken: overrides.ownerToken ?? null,
    createdAt: overrides.createdAt || new Date('2026-01-01T00:00:00Z')
  };
}

describe('reportService.compareReports — invariant I-1 (delta completeness)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a delta for EVERY category score, including machineReadabilityDelta', async () => {
    // Distinct values PER category so each delta differs — a copy-paste key-mapping
    // bug (e.g. two keys pointing at ssrDelta) would produce a wrong value and fail.
    const reportA = makeReport({
      id: 'a', overallScore: 50, ssrScore: 40, schemaScore: 30,
      semanticScore: 20, contentScore: 60, machineReadabilityScore: 10
    });
    const reportB = makeReport({
      id: 'b', overallScore: 80, ssrScore: 70, schemaScore: 55,
      semanticScore: 65, contentScore: 90, machineReadabilityScore: 85
    });

    // getReport is called twice (Promise.all); findFirst resolves each in order.
    mockFindFirst
      .mockResolvedValueOnce(reportA)
      .mockResolvedValueOnce(reportB);

    const result = await reportService.compareReports('a', 'b');

    const { comparison } = result;
    // Every category the Report model persists MUST surface a delta, and each must
    // be the correct B − A. This is the regression guard for I-1: a future 6th
    // category added without a delta here fails this assertion; a mis-mapped key
    // produces the wrong value.
    expect(comparison).toHaveProperty('scoreDelta', 30);          // 80 - 50
    expect(comparison).toHaveProperty('ssrDelta', 30);            // 70 - 40
    expect(comparison).toHaveProperty('schemaDelta', 25);         // 55 - 30
    expect(comparison).toHaveProperty('semanticDelta', 45);       // 65 - 20
    expect(comparison).toHaveProperty('contentDelta', 30);        // 90 - 60
    expect(comparison).toHaveProperty('machineReadabilityDelta', 75); // 85 - 10
  });

  it('computes machineReadabilityDelta as B − A (signed, not absolute)', async () => {
    const reportA = makeReport({ id: 'a', machineReadabilityScore: 80 });
    const reportB = makeReport({ id: 'b', machineReadabilityScore: 20 });

    mockFindFirst
      .mockResolvedValueOnce(reportA)
      .mockResolvedValueOnce(reportB);

    const result = await reportService.compareReports('a', 'b');

    // A regression to `report1 - report2` would flip the sign; assert the
    // documented direction (B − A).
    expect(result.comparison.machineReadabilityDelta).toBe(-60);
  });

  it('yields a valid zero delta for a pre-5-category report (@default(0))', async () => {
    // machineReadabilityScore defaults to 0 on legacy rows. Comparing two such
    // rows must not crash and must yield 0 (cross-era edge from I-1).
    const reportA = makeReport({ id: 'a', machineReadabilityScore: 0 });
    const reportB = makeReport({ id: 'b', machineReadabilityScore: 0 });

    mockFindFirst
      .mockResolvedValueOnce(reportA)
      .mockResolvedValueOnce(reportB);

    const result = await reportService.compareReports('a', 'b');

    expect(result.comparison.machineReadabilityDelta).toBe(0);
  });
});

describe('reportService.getReports — invariant I-2 (list payload completeness)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects machineReadabilityScore so the list payload carries all 5 category scores', async () => {
    // The explicit .select must include machineReadabilityScore. Assert the field
    // is present in the select AND flows through to the returned report rows.
    mockFindMany.mockResolvedValue([
      makeReport({ id: 'r1', machineReadabilityScore: 77 })
    ]);
    mockCount.mockResolvedValue(1);

    const result = await reportService.getReports({ page: 1, limit: 10 });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const selectArg = mockFindMany.mock.calls[0][0].select;
    expect(selectArg).toHaveProperty('machineReadabilityScore', true);

    expect(result.reports[0]).toHaveProperty('machineReadabilityScore', 77);
  });
});
