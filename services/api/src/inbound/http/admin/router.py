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
button.retry{background:#b45309;color:#fff;margin-top:8px}
button.retry:hover:not(:disabled){background:#92400e}
button:disabled{opacity:.5;cursor:not-allowed}
.btn-row{display:flex;gap:8px}
.btn-row button{flex:1}
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
  <div id="pending-card" class="card" style="margin-bottom:16px">
    <div style="font-size:13px;font-weight:600;color:#a3a3a3;margin-bottom:8px">Pending Items</div>
    <div class="stat"><span class="label">Tagging</span>
    <span class="value" id="p-tag">-</span></div>
    <div class="stat"><span class="label">Clustering</span>
    <span class="value" id="p-cluster">-</span></div>
    <div class="stat"><span class="label">Brief generation</span>
    <span class="value" id="p-brief">-</span></div>
  </div>
  <div class="row">
    <label for="secret">Internal Secret</label>
    <input id="secret" type="password" placeholder="API_INTERNAL_SECRET" autocomplete="off">
  </div>
  <div class="btn-row">
    <button class="run" id="btn">Run Pipeline</button>
    <button class="run retry" id="btn-retry" disabled>Retry Failed</button>
  </div>
  <div id="result"></div>
</div>
<script>
(function() {
  var secretInput = document.getElementById('secret');
  var btn = document.getElementById('btn');
  var btnRetry = document.getElementById('btn-retry');
  var resultBox = document.getElementById('result');
  var pTag = document.getElementById('p-tag');
  var pCluster = document.getElementById('p-cluster');
  var pBrief = document.getElementById('p-brief');
  var KEY = '_pipeline_secret';
  var totalPending = 0;
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

  async function checkPending() {
    try {
      var res = await fetch('/internal/pipeline/pending');
      var json = await res.json();
      var d = json.data || {};
      pTag.textContent = d.pending_tag != null ? d.pending_tag : '-';
      pCluster.textContent = d.pending_cluster != null ? d.pending_cluster : '-';
      pBrief.textContent = d.pending_brief != null ? d.pending_brief : '-';
      totalPending = (d.pending_tag || 0) + (d.pending_cluster || 0) + (d.pending_brief || 0);
      btnRetry.disabled = totalPending === 0;
    } catch (e) {
      pTag.textContent = '-';
      pCluster.textContent = '-';
      pBrief.textContent = '-';
      totalPending = 0;
      btnRetry.disabled = true;
    }
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function() { checkStatus(); checkPending(); }, 5000);
  }

  checkStatus();
  checkPending();
  startPolling();

  async function runPipeline(skipFetch) {
    var secret = secretInput.value.trim();
    if (!secret) { secretInput.focus(); return; }
    localStorage.setItem(KEY, secret);

    btn.disabled = true;
    btnRetry.disabled = true;
    var activeBtn = skipFetch ? btnRetry : btn;
    clearChildren(activeBtn);
    activeBtn.appendChild(el('span', {className: 'spinner'}));
    activeBtn.appendChild(document.createTextNode('Running\u2026'));
    resultBox.className = '';

    try {
      var url = '/internal/pipeline/run' + (skipFetch ? '?skip_fetch=true' : '');
      var res = await fetch(url, {
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
      clearChildren(btnRetry);
      btnRetry.textContent = 'Retry Failed';
      checkStatus();
      checkPending();
    }
  }

  btn.addEventListener('click', function() { runPipeline(false); });
  btnRetry.addEventListener('click', function() { runPipeline(true); });
})();
</script>
</body>
</html>
"""


@router.get("/pipeline")
async def pipeline_admin_page() -> HTMLResponse:
    return HTMLResponse(_PIPELINE_PAGE)
