const http = require('http');

/**
 * POST to an SSE endpoint and collect all events until stream closes.
 * @param {string} url - Full URL e.g. http://127.0.0.1:3001/api/audit-progress
 * @param {object} body - JSON body to send
 * @param {object} opts - { maxEvents?: number, timeoutMs?: number }
 * @returns {Promise<Array>} - Parsed JSON event objects
 */
function collectSSE(url, body, { maxEvents = 50, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);
    const events = [];
    let timer;

    const req = http.request({
      hostname: parsed.hostname,
      port: parseInt(parsed.port),
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              events.push(data);

              if (events.length >= maxEvents) {
                req.destroy();
                clearTimeout(timer);
                resolve(events);
                return;
              }
            } catch (_) { /* skip malformed lines */ }
          }
        }
      });

      res.on('end', () => {
        clearTimeout(timer);
        resolve(events);
      });

      res.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    timer = setTimeout(() => {
      req.destroy();
      resolve(events); // Return what we have on timeout
    }, timeoutMs);

    req.on('error', (err) => {
      // ECONNRESET is expected when req.destroy() is called
      if (err.code !== 'ECONNRESET') {
        clearTimeout(timer);
        reject(err);
      }
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { collectSSE };
