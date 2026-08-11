// Echo Lens — popup.js

document.addEventListener('DOMContentLoaded', () => {
  const signalCountEl = document.getElementById('signalCount');
  const nurseryStatusEl = document.getElementById('nurseryStatus');
  const nodeIdEl = document.getElementById('nodeId');
  const mansionUrlInput = document.getElementById('mansionUrl');
  const saveBtn = document.getElementById('saveBtn');
  const saveMsg = document.getElementById('saveMsg');

  // Load current status from background
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (!res) return;
    signalCountEl.textContent = String(res.signalCount || 0);
    nurseryStatusEl.textContent = res.nurseryRegistered ? '✅ Registered' : '⏳ Pending';
    nurseryStatusEl.className = 'value ' + (res.nurseryRegistered ? 'ok' : 'warn');
    nodeIdEl.textContent = res.nodeId || '—';
    mansionUrlInput.value = res.mansionUrl || 'http://localhost:3000';
  });

  saveBtn.addEventListener('click', () => {
    const url = mansionUrlInput.value.trim().replace(/\/$/, '');
    if (!url) return;
    chrome.storage.local.set({ mansionUrl: url }, () => {
      saveMsg.style.display = 'block';
      setTimeout(() => { saveMsg.style.display = 'none'; }, 2000);
    });
  });
});
