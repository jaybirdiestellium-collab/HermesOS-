/**
 * Echo Lens — content.js
 *
 * Watches for form/comment submissions on social media pages.
 * When text starting with "Ledger_record:" is detected, it packages
 * the annotation with the current URL and platform, then sends it to
 * the MansionOS Signal Trail via the background service worker.
 *
 * Privacy: only fires when IAM01 explicitly uses the Ledger_record: prefix.
 * No passive tracking, no screen reading.
 */

const LEDGER_PREFIX = 'Ledger_record:';

/** Detect the current platform from the hostname. */
function detectPlatform() {
  const host = location.hostname;
  if (host.includes('facebook.com')) return 'facebook';
  if (host.includes('youtube.com')) return 'youtube';
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('tiktok.com')) return 'tiktok';
  if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
  return 'other';
}

/**
 * Extract a lightweight creator/channel hint from the current URL or page title.
 * Returns null if nothing obvious is found.
 */
function extractCreatorHint() {
  // YouTube: /channel/UCxxx or /@handle
  const ytMatch = location.pathname.match(/\/@([^/]+)/) || location.pathname.match(/\/channel\/([^/]+)/);
  if (ytMatch) return ytMatch[1];

  // Facebook: /[pagename]/videos/...
  const fbMatch = location.pathname.match(/^\/([^/]+)\//);
  if (fbMatch && !['watch', 'reel', 'groups', 'pages'].includes(fbMatch[1])) {
    return fbMatch[1];
  }

  // TikTok: /@handle
  const ttMatch = location.pathname.match(/^\/@([^/]+)/);
  if (ttMatch) return ttMatch[1];

  // Twitter/X: /handle/status/...
  const twMatch = location.pathname.match(/^\/([^/]+)\/status\//);
  if (twMatch && !['home', 'explore', 'notifications', 'messages', 'i'].includes(twMatch[1])) {
    return twMatch[1];
  }

  return null;
}

/**
 * Heuristically infer topic tags from ledger text.
 * Simple keyword matching — the server or Gemini can refine later.
 */
function inferTopicTags(text) {
  const lower = text.toLowerCase();
  const tags = [];
  const matchers = [
    ['zoology', ['zoolog', 'animal', 'wildlife', 'mammal', 'reptile', 'amphibian', 'bird', 'fish', 'insect']],
    ['mythology', ['mytholog', 'myth', 'legend', 'folklore', 'deity', 'god', 'goddess', 'pantheon']],
    ['self-healing', ['self-heal', 'healing', 'trauma', 'shadow work', 'therapy', 'somatic', 'nervous system']],
    ['education', ['educat', 'learn', 'teach', 'fact', 'science', 'history', 'research']],
    ['daily-facts', ['daily fact', 'fun fact', 'did you know', 'daily animal']],
    ['spirituality', ['spirit', 'ritual', 'sacred', 'metaphysic', 'esoteric', 'occult', 'tarot', 'astrology']],
    ['birds', ['bird', 'avian', 'feather', 'raptor', 'owl', 'parrot', 'crow', 'raven']],
    ['creator-support', ['support', 'underrated', 'small creator', 'hidden gem', 'deserve more']],
  ];
  for (const [tag, keywords] of matchers) {
    if (keywords.some(kw => lower.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * Process a text value — if it starts with Ledger_record:, dispatch the signal.
 */
function processText(text) {
  if (typeof text !== 'string') return;
  const trimmed = text.trim();
  if (!trimmed.startsWith(LEDGER_PREFIX)) return;

  const ledger_text = trimmed.slice(LEDGER_PREFIX.length).trim();
  if (!ledger_text) return;

  const platform = detectPlatform();
  const creator_hint = extractCreatorHint();
  const topic_tags = inferTopicTags(ledger_text);

  const signal = {
    ledger_text,
    source_url: location.href,
    platform,
    topic_tags,
    creator_hint: creator_hint || undefined,
  };

  chrome.runtime.sendMessage({ type: 'SIGNAL_INGEST', signal });
  console.log('[Echo Lens] Signal dispatched:', signal);
}

/**
 * Observe DOM events for comment/reply form submissions.
 * Covers both classic form submit events and React-style click-to-post buttons.
 */
function attachListeners() {
  // Strategy 1: form submit events
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const textarea = form.querySelector('textarea, [contenteditable="true"]');
    if (textarea) {
      processText(textarea.value || textarea.textContent || '');
    }
  }, true);

  // Strategy 2: keydown Enter on comment boxes (Facebook / Twitter patterns)
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.matches('[contenteditable="true"], textarea')) return;
    processText(target.textContent || (target instanceof HTMLTextAreaElement ? target.value : '') || '');
  }, true);

  // Strategy 3: click on post/comment/reply buttons — sample text from nearby editable
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest('button, [role="button"]');
    if (!btn) return;
    const label = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
    if (!['post', 'comment', 'reply', 'send', 'submit'].some(w => label.includes(w))) return;

    // Look for a nearby editable field (parent form or container)
    const container = btn.closest('form, [role="dialog"], [role="article"], section, div') || document.body;
    const editable = container.querySelector('[contenteditable="true"], textarea');
    if (editable) {
      processText(editable.textContent || (editable instanceof HTMLTextAreaElement ? editable.value : '') || '');
    }
  }, true);
}

attachListeners();
