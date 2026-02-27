from fastapi import APIRouter
from starlette.responses import HTMLResponse

router = APIRouter(prefix="/admin", tags=["admin"])

_PIPELINE_PAGE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pipeline Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;
  display:flex;justify-content:center;padding:48px 16px}
.wrap{max-width:520px;width:100%}
h1{font-size:20px;font-weight:600;margin-bottom:24px;color:#fafafa}
label{display:block;font-size:13px;color:#a3a3a3;margin-bottom:6px}
input{width:100%;padding:8px 12px;border:1px solid #262626;border-radius:6px;
  background:#171717;color:#e5e5e5;font-size:14px;outline:none}
input:focus{border-color:#525252}
.row{margin-bottom:16px}
button{width:100%;padding:10px;border:none;border-radius:6px;font-size:14px;
  font-weight:500;cursor:pointer;transition:background .15s}
button.run{background:#2563eb;color:#fff}
button.run:hover:not(:disabled){background:#1d4ed8}
button:disabled{opacity:.5;cursor:not-allowed}
#result{margin-top:24px;display:none}
#result.show{display:block}
.card{padding:16px;border-radius:8px;border:1px solid #262626;background:#171717}
.stat{display:flex;justify-content:space-between;padding:6px 0;
  border-bottom:1px solid #1e1e1e;font-size:13px}
.stat:last-child{border-bottom:none}
.stat .label{color:#a3a3a3}
.stat .value{font-variant-numeric:tabular-nums;font-weight:500}
.ok{color:#22c55e}.warn{color:#eab308}.err{color:#ef4444}
.errors{margin-top:12px;padding:10px;background:#1c1917;border:1px solid #451a03;
  border-radius:6px;font-size:12px;color:#fbbf24}
.errors li{margin-left:16px;margin-top:4px}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid #ffffff40;
  border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;
  vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
.status-bar{padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:16px;
  display:flex;align-items:center;gap:8px}
.status-bar.running{background:#172554;border:1px solid #1e40af;color:#93c5fd}
.status-bar.idle{background:#171717;border:1px solid #262626;color:#a3a3a3}
</style>
</head>
<body>
<div class="wrap">
  <h1>Pipeline Admin</h1>
  <div id="status-bar" class="status-bar idle">Checking status\u2026</div>
  <div class="row">
    <label for="secret">Internal Secret</label>
    <input id="secret" type="password" placeholder="API_INTERNAL_SECRET" autocomplete="off">
  </div>
  <button class="run" id="btn">Run Pipeline</button>
  <div id="result"></div>
</div>
<script>
(function() {
  var secretInput = document.getElementById('secret');
  var btn = document.getElementById('btn');
  var resultBox = document.getElementById('result');
  var KEY = '_pipeline_secret';
  secretInput.value = localStorage.getItem(KEY) || '';

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      children.forEach(function(c) {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else node.appendChild(c);
      });
    }
    return node;
  }

  function makeStat(label, value) {
    return el('div', {className: 'stat'}, [
      el('span', {className: 'label', textContent: label}),
      el('span', {className: 'value', textContent: String(value)})
    ]);
  }

  function showResult(nodes) {
    clearChildren(resultBox);
    var card = el('div', {className: 'card'});
    nodes.forEach(function(n) { card.appendChild(n); });
    resultBox.appendChild(card);
    resultBox.className = 'show';
  }

  var statusBar = document.getElementById('status-bar');
  var pollTimer = null;

  async function checkStatus() {
    try {
      var res = await fetch('/internal/pipeline/status');
      var json = await res.json();
      var running = json.data && json.data.is_running;
      statusBar.className = 'status-bar ' + (running ? 'running' : 'idle');
      clearChildren(statusBar);
      if (running) {
        statusBar.appendChild(el('span', {className: 'spinner'}));
        statusBar.appendChild(document.createTextNode('Pipeline is running\u2026'));
        btn.disabled = true;
      } else {
        statusBar.appendChild(document.createTextNode('Pipeline is idle'));
        btn.disabled = false;
      }
    } catch (e) {
      statusBar.className = 'status-bar idle';
      clearChildren(statusBar);
      statusBar.appendChild(document.createTextNode('Status unavailable'));
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(checkStatus, 5000);
  }

  checkStatus();
  startPolling();

  btn.addEventListener('click', async function() {
    var secret = secretInput.value.trim();
    if (!secret) { secretInput.focus(); return; }
    localStorage.setItem(KEY, secret);

    btn.disabled = true;
    clearChildren(btn);
    btn.appendChild(el('span', {className: 'spinner'}));
    btn.appendChild(document.createTextNode('Running\u2026'));
    resultBox.className = '';

    try {
      var res = await fetch('/internal/pipeline/run', {
        method: 'POST',
        headers: { 'X-Internal-Secret': secret }
      });
      var json = await res.json();

      if (res.status === 403) {
        showResult([
          el('h2', {className: 'err', textContent: '403 Forbidden'}),
          el('p', {className: 'label', textContent: 'Invalid secret.', style: 'margin-top:8px'})
        ]);
        return;
      }

      var d = json.data;
      var hasErr = d.errors && d.errors.length > 0;
      var nodes = [
        el('h2', {
          className: hasErr ? 'warn' : 'ok',
          textContent: hasErr ? 'Completed with errors' : 'Success',
          style: 'font-size:15px;font-weight:600;margin-bottom:12px'
        }),
        makeStat('Posts fetched', d.posts_fetched),
        makeStat('Posts upserted', d.posts_upserted),
        makeStat('Posts tagged', d.posts_tagged),
        makeStat('Clusters created', d.clusters_created),
        makeStat('Briefs generated', d.briefs_generated)
      ];

      if (hasErr) {
        var errList = el('ul');
        d.errors.forEach(function(e) {
          errList.appendChild(el('li', {textContent: e}));
        });
        var errBox = el('div', {className: 'errors'}, [
          el('strong', {textContent: 'Errors:'}),
          errList
        ]);
        nodes.push(errBox);
      }

      showResult(nodes);
    } catch (e) {
      showResult([
        el('h2', {className: 'err', textContent: 'Network Error'}),
        el('p', {className: 'label', textContent: e.message, style: 'margin-top:8px'})
      ]);
    } finally {
      clearChildren(btn);
      btn.textContent = 'Run Pipeline';
      checkStatus();
    }
  });
})();
</script>
</body>
</html>
"""


@router.get("/pipeline")
async def pipeline_admin_page() -> HTMLResponse:
    return HTMLResponse(_PIPELINE_PAGE)
