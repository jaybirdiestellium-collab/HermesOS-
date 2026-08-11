/**
 * Echo Lens — background.js (Manifest V3 service worker)
 *
 * Receives SIGNAL_INGEST messages from content.js and forwards
 * them to the MansionOS /api/signal/ingest endpoint.
 *
 * Also handles first-run Nursery node registration for the
 * Echo Lens node (role: content-trail-collector, clearance: signal).
 */

const DEFAULT_MANSION_URL = 'http://localhost:3000';
const ECHO_LENS_NODE_NAME = 'Echo Lens';
const ECHO_LENS_NODE_ROLE = 'content-trail-collector';

/** Read Mansion URL from storage, fall back to localhost. */
async function getMansionUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['mansionUrl'], (result) => {
      resolve(result.mansionUrl || DEFAULT_MANSION_URL);
    });
  });
}

/** Read or generate a stable node_id for this Echo Lens instance. */
async function getOrCreateNodeId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['echoLensNodeId'], (result) => {
      if (result.echoLensNodeId) {
        resolve(result.echoLensNodeId);
      } else {
        const id = `node_echo_lens_001`;
        chrome.storage.local.set({ echoLensNodeId: id });
        resolve(id);
      }
    });
  });
}

/**
 * Register Echo Lens as a Nursery node on first successful ingest.
 * Idempotent — server returns 409 if already registered.
 */
async function ensureNurseryRegistration(mansionUrl, nodeId) {
  const registered = await new Promise((resolve) => {
    chrome.storage.local.get(['nurseryRegistered'], (r) => resolve(!!r.nurseryRegistered));
  });
  if (registered) return;

  try {
    const res = await fetch(`${mansionUrl}/api/nursery/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: ECHO_LENS_NODE_NAME,
        role: ECHO_LENS_NODE_ROLE,
        clearance: 'witness',
        tags: ['content-trail', 'echo-lens', 'signal', 'browser-extension'],
        node_id: nodeId,
      }),
    });
    if (res.status === 201 || res.status === 409) {
      chrome.storage.local.set({ nurseryRegistered: true });
      console.log('[Echo Lens] Nursery registration complete.');
    }
  } catch (err) {
    // Mansion may not be reachable yet — will retry on next signal
    console.warn('[Echo Lens] Nursery registration deferred:', err.message);
  }
}

/** Send a signal to the Mansion /api/signal/ingest endpoint. */
async function ingestSignal(signal) {
  const mansionUrl = await getMansionUrl();
  const nodeId = await getOrCreateNodeId();
  await ensureNurseryRegistration(mansionUrl, nodeId);

  const res = await fetch(`${mansionUrl}/api/signal/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...signal, node_id: nodeId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log('[Echo Lens] Signal ingested:', data.entry?.id);

  // Update badge to show recent signal count
  chrome.storage.local.get(['signalCount'], (r) => {
    const count = (r.signalCount || 0) + 1;
    chrome.storage.local.set({ signalCount: count });
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
  });

  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SIGNAL_INGEST') {
    ingestSignal(message.signal)
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
});

// Expose status check for popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['mansionUrl', 'signalCount', 'nurseryRegistered', 'echoLensNodeId'], (r) => {
      sendResponse({
        mansionUrl: r.mansionUrl || DEFAULT_MANSION_URL,
        signalCount: r.signalCount || 0,
        nurseryRegistered: !!r.nurseryRegistered,
        nodeId: r.echoLensNodeId || null,
      });
    });
    return true;
  }
});
