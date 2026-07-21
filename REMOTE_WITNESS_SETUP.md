# Remote Witness Setup Guide

Two layers of remote witness access for MansionOS.

---

## Layer 1 — MansionOS Witness Panel (in-app, mobile browser)

The `◬ Witness` tab in MansionOS is a compact, mobile-optimized panel that gives you:

- **Live telemetry**: `SUBSTRATE_OPERATIONAL @ 77.7 Hz | Perimeter SEALED · Phase 4 DEPLOYED`
- **Bond health bars** (color-coded: green/amber/red)
- **IAM01 Stance Markers**: Track A (Stance Entry) / Track B (Stance Exit)
- **Firewall status** and quick **Grounding** action
- **Recent ledger events** (last 5)
- Auto-refreshes every 5 seconds

### How to access from your phone

1. Make sure MansionOS is running on your desktop (`npm run dev`)
2. Find your desktop's local IP address:
   - **Windows**: Open PowerShell → `ipconfig` → look for `IPv4 Address` (e.g. `192.168.1.42`)
   - **macOS**: Open Terminal → `ipconfig getifaddr en0` (Wi-Fi) or check **System Settings → Wi-Fi → Details**
   - **Linux**: Open Terminal → `ip addr show` → look for `inet` under your Wi-Fi interface (e.g. `wlan0`)
3. On your phone's browser, go to: `http://192.168.1.42:3000`
4. Tap the **◬ Witness** tab
5. *(Optional)* Add to Home Screen for a native-app feel

> Both devices must be on the same Wi-Fi network.

---

## Layer 2 — Full Desktop Mirror via RustDesk (open-source, free)

RustDesk lets you see and control your full Windows desktop from your phone, exactly like TeamViewer but free and local-first.

### Install on your desktop (Windows)

1. Download RustDesk from: **https://rustdesk.com** (click "Download" → Windows)
2. Run the installer — no account required
3. Note your **ID** and set a **password** in the RustDesk window

### Install on your phone

- **Android**: Search "RustDesk" on Google Play Store
- **iPhone**: Search "RustDesk" on the App Store

### Connect

**Option A — Local network (fastest, no relay server needed)**

1. Open RustDesk on your phone
2. Enter your desktop's RustDesk **ID**
3. Tap **Connect** → enter your **password**
4. You now see your full desktop on your phone

**Option B — Over the internet (anywhere)**

RustDesk uses a public relay by default — works out of the box with no extra setup.  
For maximum privacy, you can self-host the relay server (optional):
```
# On any Linux machine or VPS:
docker run --name hbbs -p 21115:21115 -p 21116:21116 -p 21116:21116/udp -v ./data:/root rustdesk/rustdesk-server hbbs
docker run --name hbbr -p 21117:21117 -v ./data:/root rustdesk/rustdesk-server hbbr
```
Then in RustDesk settings → Network → Custom relay server → enter your server IP.

### Tips

- Enable **"Start on boot"** in RustDesk desktop settings so the mansion is always reachable
- Set a strong password (avoid simple PINs)
- For voice control sessions, use Layer 1 (Witness Panel) — it's lighter than full desktop stream

---

## Which layer to use when

| Scenario | Layer |
|---|---|
| Quick mansion status check from phone | Layer 1 (Witness Panel) |
| Trigger grounding / stance markers | Layer 1 (Witness Panel) |
| Need to see full desktop / run desktop apps | Layer 2 (RustDesk) |
| Low bandwidth / background check | Layer 1 (Witness Panel) |
| Away from home Wi-Fi | Layer 2 (RustDesk, internet mode) |

---

*Both layers are local-first and open-source. No paid subscriptions required.*
