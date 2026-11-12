/* SoberAI extension popup: audit the active tab via the local backend. */
(function () {
  'use strict';

  var lib = window.SoberAIAudit;
  var $ = function (id) { return document.getElementById(id); };

  var CATEGORIES = [
    ['ssrReadiness', 'SSR Readiness'],
    ['schemaCoverage', 'Schema Coverage'],
    ['semanticStructure', 'Semantic Structure'],
    ['contentExtractability', 'Content Extractability'],
    ['machineReadability', 'Machine Readability']
  ];

  var state = {
    tabUrl: null,
    backend: lib.DEFAULT_BACKEND,
    settings: {},
    reportUrl: null
  };

  function gradeFor(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  function showError(message) {
    var el = $('error');
    el.textContent = message;
    el.hidden = false;
  }

  function setRunning(running) {
    $('runBtn').disabled = running;
    $('runBtn').textContent = running ? 'Running Audit…' : 'Run Audit';
    $('progress').hidden = !running;
    if (running) {
      $('result').hidden = true;
      $('error').hidden = true;
      $('barFill').style.width = '0';
      $('pct').textContent = '0%';
      $('phaseLabel').textContent = 'Starting…';
      $('eta').textContent = '';
    }
  }

  function renderResult(payload) {
    var result = payload.result || {};
    var scores = result.scores || {};
    var overall = typeof scores.overall === 'number' ? scores.overall : null;
    $('overallScore').textContent = overall === null ? '–' : String(overall);
    $('grade').textContent = 'Grade ' + (scores.grade || (overall === null ? '–' : gradeFor(overall)));
    $('recNote').hidden = !payload.fallbackUsed;

    var cats = scores.categories || {};
    var ul = $('categories');
    ul.textContent = '';
    CATEGORIES.forEach(function (pair) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.textContent = pair[1];
      var value = document.createElement('span');
      value.className = 'cat-score';
      var entry = cats[pair[0]];
      value.textContent = entry && typeof entry.score === 'number' ? String(entry.score) : '–';
      li.appendChild(name);
      li.appendChild(value);
      ul.appendChild(li);
    });

    $('result').hidden = false;
  }

  function onEvent(data) {
    if (data.status === 'completed' && data.reportId) {
      state.reportUrl = state.backend + '/app/reports/' + data.reportId;
    }
    renderEvent(data);
  }

  function renderEvent(data) {
    if (data.status === 'completed') {
      setRunning(false);
      $('progress').hidden = true;
      renderResult(data);
      return;
    }
    if (data.status === 'error') {
      setRunning(false);
      showError(data.message || 'Audit failed');
      return;
    }
    if (data.status === 'processing' || data.status === 'started') {
      if (data.message) $('phaseLabel').textContent = data.message;
      var pct = Math.min(data.progress || 0, 99);
      $('barFill').style.width = pct + '%';
      $('pct').textContent = pct + '%';
      $('eta').textContent = data.eta ? '≈' + data.eta + 's remaining' : '';
    }
  }

  function runAudit() {
    if (!state.tabUrl) return;
    setRunning(true);

    var headers = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    };
    var byo = lib.buildAuditHeaders(state.settings);
    if (byo) {
      Object.keys(byo).forEach(function (k) { headers[k] = byo[k]; });
    }

    fetch(state.backend + '/api/audit-progress', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ url: state.tabUrl })
    }).then(function (response) {
      if (!response.ok) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          throw new Error(body.error || 'Audit request failed (' + response.status + ')');
        });
      }
      var parser = lib.createSSEParser(onEvent);
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      function pump() {
        return reader.read().then(function (chunk) {
          if (chunk.done) {
            parser.flush();
            return;
          }
          parser.push(decoder.decode(chunk.value, { stream: true }));
          return pump();
        });
      }
      return pump();
    }).catch(function (err) {
      setRunning(false);
      if (err && (err.name === 'TypeError' || /fetch/i.test(err.message || ''))) {
        showError(
          'Cannot reach the SoberAI backend at ' + state.backend + '.\n' +
          'Start it (node src/api/server.js or the Electron app) and retry.'
        );
      } else {
        showError(err.message || 'Audit failed');
      }
    });
  }

  function init() {
    $('runBtn').addEventListener('click', runAudit);
    $('optionsLink').addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    $('noKeyOptions').addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    $('openReport').addEventListener('click', function (e) {
      e.preventDefault();
      if (state.reportUrl) chrome.tabs.create({ url: state.reportUrl });
    });

    chrome.storage.local.get(
      ['backendUrl', 'provider', 'apiKey', 'endpoint', 'model'],
      function (stored) {
        try {
          state.backend = lib.normalizeBackendUrl(stored.backendUrl);
        } catch (err) {
          showError(err.message);
          $('runBtn').disabled = true;
        }
        state.settings = {
          provider: stored.provider || lib.DEFAULT_PROVIDER,
          apiKey: stored.apiKey || '',
          endpoint: stored.endpoint || '',
          model: stored.model || ''
        };
        $('backendLabel').textContent = state.backend;
        $('keyDot').classList.toggle('on', Boolean(state.settings.apiKey));
        $('noKey').hidden = Boolean(state.settings.apiKey);

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          var url = tabs && tabs[0] && tabs[0].url;
          if (url && /^https?:\/\//i.test(url)) {
            state.tabUrl = url.split('#')[0];
            $('tabUrl').textContent = state.tabUrl;
            document.querySelector('.url-row').title = state.tabUrl;
          } else {
            $('tabUrl').textContent = '(not a web page)';
            $('unsupported').hidden = false;
            $('runBtn').disabled = true;
          }
        });
      }
    );
  }

  document.addEventListener('DOMContentLoaded', init);
})();
