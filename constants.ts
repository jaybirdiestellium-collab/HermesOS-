/**
 * @fileoverview Global constants for the MansionOS application.
 */

export const GEMINI_CHAT_MODEL = 'gemini-3-pro-preview';
export const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';
export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
// Model used by the Waymaker-Weaver server-side daemon
export const GEMINI_WEAVER_MODEL = 'gemini-3.1-pro-preview';

export const AI_STUDIO_BILLING_URL = 'https://ai.google.dev/gemini-api/docs/billing';

export enum ImageSize {
  K1 = '1K',
  K2 = '2K',
  K4 = '4K',
}

export const SUPPORTED_IMAGE_SIZES: ImageSize[] = [
  ImageSize.K1,
  ImageSize.K2,
  ImageSize.K4,
];

export const SUPPORTED_VOICE_NAMES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

export const MAX_CHAT_MESSAGES = 50; // Max messages to keep in chat history
