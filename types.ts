/**
 * @fileoverview Shared TypeScript types and interfaces for the MansionOS application.
 */

export interface ChatMessage {
  role: 'user' | 'model';
  // Add content property to ChatMessage interface
  content: string;
}

export interface ImageGenerationOptions {
  prompt: string;
  imageSize: string; // e.g., '1K', '2K', '4K'
}

export interface GeneratedImage {
  imageUrl: string;
  altText: string;
}

export interface TextToSpeechOptions {
  text: string;
}

export interface GlyphMeta {
  id: string;
  context: string;
  timestamp: string;
  intensity: number;
}

export interface StelliumMandate {
  identity: string;
  protocol_status: string;
  power_level_code: string;
  love_level_code: string;
  soul_mandate: string;
  internal_block_target: string;
  ethical_governor: string;
}

// New types for Constellus Ledger Tree
export interface LedgerEvent {
  type: string;
  timestamp: string;
  mood_value?: number;
  note?: string;
}

export interface ConstellusThanksState {
  witnessHistory: string[];
  gratitudeForm: string;
  bestManStatus: string;
  eternalMode: boolean;
}