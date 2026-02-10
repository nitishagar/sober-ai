const router = require('../../src/api/routes/reports');

describe('reports routes', () => {
  it('registers compare route before :reportId route to avoid shadowing', () => {
    const routePaths = router.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);

    const compareIndex = routePaths.indexOf('/compare/:id1/:id2');
    const reportIdIndex = routePaths.indexOf('/:reportId');

    expect(compareIndex).toBeGreaterThan(-1);
    expect(reportIdIndex).toBeGreaterThan(-1);
    expect(compareIndex).toBeLessThan(reportIdIndex);
  });
});
