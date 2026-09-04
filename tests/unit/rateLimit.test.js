// The three write POST routes must share ONE limiter instance (same per-IP
// budget, same 429 shape) — not three equal configs with separate counters.
describe('shared audit rate limiter (S12)', () => {
  let isolated;

  beforeAll(() => {
    // audit-progress.js arms a 60s session-cleanup setInterval at module load;
    // load it under fake timers so the unit project exits cleanly.
    jest.useFakeTimers();
    try {
      jest.isolateModules(() => {
        isolated = {
          limiter: require('../../src/api/middleware/rate-limit').auditLimiter,
          auditProgress: require('../../src/api/routes/audit-progress'),
          audit: require('../../src/api/routes/audit'),
          batch: require('../../src/api/routes/batch')
        };
      });
    } finally {
      jest.useRealTimers();
    }
  });

  function postRootHandles(router) {
    const handles = [];
    for (const layer of router.stack || []) {
      if (layer.route && layer.route.path === '/' && layer.route.methods.post) {
        for (const rlayer of layer.route.stack || []) {
          handles.push(rlayer.handle);
        }
      }
    }
    return handles;
  }

  it('exports a middleware function', () => {
    expect(typeof isolated.limiter).toBe('function');
  });

  it.each(['auditProgress', 'audit', 'batch'])(
    'mounts the SAME instance on POST / of %s',
    (name) => {
      expect(postRootHandles(isolated[name])).toContain(isolated.limiter);
    }
  );
});
