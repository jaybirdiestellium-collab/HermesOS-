<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b48b0bae-a6c8-4ae8-acf3-26eabec87d05

## Quick install

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

The installer clones HermesOS into `~/HermesOS`, installs npm dependencies, and creates a starter `.env.local` if one does not already exist.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

If you used the installer, your next steps are:

1. `cd ~/HermesOS`
2. Add your Gemini API key to `.env.local`
3. Run `npm run dev`
