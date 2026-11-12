/* SoberAI extension options: backend + BYO credentials in chrome.storage.local. */
(function () {
  'use strict';

  var lib = window.SoberAIAudit;
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ['backendUrl', 'provider', 'apiKey', 'endpoint', 'model'];

  function message(text, ok) {
    var el = $('message');
    el.textContent = text;
    el.hidden = false;
    el.className = 'test-result ' + (ok ? 'ok' : 'fail');
  }

  function currentForm() {
    return {
      backendUrl: $('backendUrl').value.trim(),
      provider: $('provider').value,
      apiKey: $('apiKey').value,
      endpoint: $('endpoint').value.trim(),
      model: $('model').value.trim()
    };
  }

  function refreshGrantRow(backendUrl) {
    var backend;
    try {
      backend = lib.normalizeBackendUrl(backendUrl);
    } catch (_) {
      $('grantRow').hidden = true;
      return;
    }
    if (lib.isLoopbackBackend(backend)) {
      $('grantRow').hidden = true;
      return;
    }
    var origin = new URL(backend).origin + '/*';
    chrome.permissions.contains({ origins: [origin] }, function (granted) {
      $('grantRow').hidden = granted;
      $('grantHint').textContent = granted ? '' : ('Not granted: ' + origin);
    });
  }

  function init() {
    chrome.storage.local.get(KEYS, function (stored) {
      $('backendUrl').value = stored.backendUrl || '';
      $('provider').value = stored.provider || lib.DEFAULT_PROVIDER;
      $('apiKey').value = stored.apiKey || '';
      $('endpoint').value = stored.endpoint || '';
      $('model').value = stored.model || '';
      refreshGrantRow(stored.backendUrl);
    });

    $('backendUrl').addEventListener('input', function (e) {
      refreshGrantRow(e.target.value);
    });

    $('grantBtn').addEventListener('click', function () {
      var backend;
      try {
        backend = lib.normalizeBackendUrl($('backendUrl').value);
      } catch (err) {
        message(err.message, false);
        return;
      }
      var origin = new URL(backend).origin + '/*';
      chrome.permissions.request({ origins: [origin] }, function (granted) {
        message(
          granted ? 'Access granted for ' + origin : 'Access not granted — audits to this backend will fail.',
          granted
        );
        refreshGrantRow(backend);
      });
    });

    $('saveBtn').addEventListener('click', function () {
      var form = currentForm();
      try {
        form.backendUrl = lib.normalizeBackendUrl(form.backendUrl);
      } catch (err) {
        message(err.message, false);
        return;
      }
      chrome.storage.local.set(form, function () {
        message('Saved to this browser only.', true);
        refreshGrantRow(form.backendUrl);
      });
    });

    $('clearBtn').addEventListener('click', function () {
      chrome.storage.local.remove(['apiKey'], function () {
        $('apiKey').value = '';
        message('API key cleared from this browser.', true);
      });
    });

    $('testBtn').addEventListener('click', function () {
      var form = currentForm();
      var backend;
      try {
        backend = lib.normalizeBackendUrl(form.backendUrl);
      } catch (err) {
        message(err.message, false);
        return;
      }
      if (!form.apiKey) {
        message('Enter an API key to test (nothing is saved by testing).', false);
        return;
      }
      message('Testing…', true);
      // Same dual contract as the web Settings BYO test: the key rides the
      // body and is never persisted server-side.
      fetch(backend + '/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.provider,
          apiKey: form.apiKey,
          endpoint: form.endpoint,
          model: form.model
        })
      }).then(function (res) {
        return res.json();
      }).then(function (data) {
        message((data.ok ? 'Connected: ' : 'Failed: ') + (data.message || ''), Boolean(data.ok));
      }).catch(function () {
        message('Cannot reach the backend at ' + backend + '.', false);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
