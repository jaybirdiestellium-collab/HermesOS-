# Echo Lens — MansionOS Phase 6 Browser Extension

> *The echo of a glass runtime — not on your face, but in your browser.*

Echo Lens is a Manifest V3 Chrome extension that acts as the sensor layer for the **Signal Mirror Wing** in MansionOS. It watches for `Ledger_record:` comments you post on social media feeds and forwards them to the Mansion's `/api/signal/ingest` endpoint.

---

## How it works

1. You watch a video on Facebook, YouTube, TikTok, etc.
2. You write a comment starting with `Ledger_record:` (e.g. `Ledger_record: Great zoology daily-facts format, clearly passionate creator`)
3. When you post, Echo Lens intercepts the text, packages it with the current URL and platform, and POSTs it to the Mansion.
4. The Mansion logs it to the Signal Trail ledger and emits it to the Gemini substrate.
5. The Signal Mirror Wing displays your growing trail — grouped by topic, creator, and platform.

---

## Installation (Chrome / Edge / Brave)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `echo-lens/` folder in this repository

---

## Configuration

Click the extension icon to open the popup. Set the **Mansion URL** if your server runs on a non-standard port or remote address (default: `http://localhost:3000`).

---

## Privacy

- Echo Lens only activates when you type `Ledger_record:` as the comment prefix.
- No passive tracking, no screen reading, no video metadata collection.
- All data is sent only to your local MansionOS server — nothing goes to any third party.
- You are the sensor; the extension is the pipe.

---

## Files

```
echo-lens/
├── manifest.json       # Manifest V3 extension config
├── content.js          # Watches for Ledger_record: annotations on social pages
├── background.js       # Service worker — forwards signals to Mansion, handles Nursery registration
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
└── icons/              # Extension icons (add 16x16, 48x48, 128x128 PNGs here)
```

---

## Nursery Registration

On first successful signal ingest, Echo Lens automatically registers itself as a Nursery node:

- **Name**: Echo Lens
- **Role**: content-trail-collector
- **Clearance**: witness
- **Tags**: content-trail, echo-lens, signal, browser-extension
