/**
 * SoberAI extension — pure audit helpers shared by popup.js and options.js.
 *
 * UMD so the same file loads as a classic extension-page script (MV3 bans
 * remote code and inline scripts, not local classic scripts) and as a
 * CommonJS module under the repo's jest unit harness.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SoberAIAudit = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_BACKEND = 'http://localhost:3000';
  var DEFAULT_PROVIDER = 'openai';

  /**
   * Normalize a backend base URL. Empty input yields the local default.
   * Throws on non-http(s) input (never silently re-point an audit).
   */
  function normalizeBackendUrl(raw) {
    var value = (raw || '').trim().replace(/\/+$/, '');
    if (!value) return DEFAULT_BACKEND;
    if (!/^https?:\/\//i.test(value)) {
      throw new Error('Backend URL must start with http:// or https://');
    }
    return value;
  }

  /**
   * True when the backend is loopback (covered by host_permissions, no
   * optional-origin grant needed).
   */
  function isLoopbackBackend(backendUrl) {
    try {
      var host = new URL(backendUrl).hostname.toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
    } catch (_) {
      return false;
    }
  }

  /**
   * The X-LLM-* headers for an audit POST, or null when no key is stored.
   * Mirrors the web app's BYO contract (S9/S21): key travels per-request,
   * is never persisted server-side, and the provider defaults to openai.
   */
  function buildAuditHeaders(settings) {
    settings = settings || {};
    if (!settings.apiKey) return null;
    var headers = {
      'X-LLM-API-Key': settings.apiKey,
      'X-LLM-Provider': settings.provider || DEFAULT_PROVIDER
    };
    if (settings.endpoint) headers['X-LLM-Endpoint'] = settings.endpoint;
    if (settings.model) headers['X-LLM-Model'] = settings.model;
    return headers;
  }

  /**
   * Incremental SSE parser. push() accepts decoded text chunks (a `data:`
   * line may straddle chunk boundaries); complete events are delivered to
   * onEvent. Malformed lines are ignored, mirroring the web client.
   */
  function createSSEParser(onEvent) {
    var buffer = '';
    function dispatch(line) {
      if (line.indexOf('data: ') !== 0) return;
      try {
        onEvent(JSON.parse(line.substring(6)));
      } catch (_) {
        // Tolerate heartbeat/comment and torn lines.
      }
    }
    return {
      push: function (chunk) {
        buffer += chunk;
        var idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          dispatch(buffer.slice(0, idx).replace(/\r$/, ''));
          buffer = buffer.slice(idx + 1);
        }
      },
      flush: function () {
        if (buffer) {
          dispatch(buffer);
          buffer = '';
        }
      }
    };
  }

  return {
    DEFAULT_BACKEND: DEFAULT_BACKEND,
    DEFAULT_PROVIDER: DEFAULT_PROVIDER,
    normalizeBackendUrl: normalizeBackendUrl,
    isLoopbackBackend: isLoopbackBackend,
    buildAuditHeaders: buildAuditHeaders,
    createSSEParser: createSSEParser
  };
});
