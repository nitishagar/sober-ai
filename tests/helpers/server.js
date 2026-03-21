// Returns { start(), stop(), url() } for managing Express test server lifecycle
function makeTestServer(app) {
  let server = null;

  return {
    async start() {
      await new Promise((resolve, reject) => {
        server = app.listen(0, '127.0.0.1', resolve);
        server.once('error', reject);
      });
    },
    stop() {
      return new Promise(resolve => server ? server.close(resolve) : resolve());
    },
    url() {
      if (!server) throw new Error('Server not started');
      return `http://127.0.0.1:${server.address().port}`;
    },
    port() {
      if (!server) throw new Error('Server not started');
      return server.address().port;
    }
  };
}

module.exports = { makeTestServer };
