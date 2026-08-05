/**
 * @fileoverview Shared TypeScript types and interfaces for the MansionOS application.
 */

import { ImageSize } from './constants';

/**
 * Represents a single chat message exchanged with the chat model.
 */
export interface ChatMessage {
  /**
   * Sender role expected by the chat service.
   */
  role: 'user' | 'model';
  /**
   * Text content for the message body.
   */
  content: string;
  /**
   * Optional stable identifier for keyed rendering or persistence.
   */
  id?: string;
  /**
   * Optional ISO-8601 timestamp describing when the message was created.
   */
  timestamp?: string;
}

/**
 * Options for Gemini image generation requests.
 */
export interface ImageGenerationOptions {
  /**
   * Natural-language description of the desired image.
   */
  prompt: string;
  /**
   * Supported output size for image generation.
   */
  imageSize: ImageSize;
}

/**
 * Represents a generated image asset.
 */
export interface GeneratedImage {
  imageUrl: string;
  altText: string;
}

/**
 * Supported prebuilt voice names exposed by the Voice Library UI.
 * Expected values currently include: 'Zephyr', 'Puck', 'Charon', 'Kore', and 'Fenrir'.
 */
export type SupportedVoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

/**
 * Options for text-to-speech generation.
 */
export interface TextToSpeechOptions {
  /**
   * Raw text to synthesize into audio.
   */
  text: string;
  /**
   * Optional prebuilt voice name from the supported voice library.
   */
  voiceName?: SupportedVoiceName;
  /**
   * Optional playback speed multiplier for voice customization when supported.
   */
  speed?: number;
  /**
   * Optional pitch adjustment for voice customization when supported.
   */
  pitch?: number;
}

/**
 * Metadata for a glyph interaction.
 */
export interface GlyphMeta {
  id: string;
  context: string;
  timestamp: string;
  intensity: number;
}

/**
 * Describes the active Stellium mandate state.
 */
export interface StelliumMandate {
  identity: string;
  protocol_status: string;
  power_level_code: string;
  love_level_code: string;
  soul_mandate: string;
  internal_block_target: string;
  ethical_governor: string;
}

/**
 * Generic ledger event shape used by the Constellus Ledger Tree.
 * Event-specific data should be stored within `payload`.
 */
export interface LedgerEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string,
> {
  /**
   * Discriminator describing the event kind.
   */
  type: TType;
  /**
   * ISO-8601 timestamp used for ordering inside the ledger tree.
   */
  timestamp: string;
  /**
   * Event-specific structured payload.
   */
  payload: TPayload;
}

/**
 * Ledger event payload for witnessed unspoken mood echoes.
 */
export type UnspokenEchoEvent = LedgerEvent<{ mood_value: number }, 'unspoken_echo'>;

/**
 * Ledger event payload for synthetic gap-filling echoes.
 */
export type FractalEchoEvent = LedgerEvent<{ note: string }, 'fractal_echo'>;

/**
 * Known ledger event union currently produced by the Constellus ledger implementation.
 */
export type KnownLedgerEvent = UnspokenEchoEvent | FractalEchoEvent;

/**
 * Extracts the payload type from a ledger event type.
 */
export type EventPayload<T extends LedgerEvent> = T['payload'];

/**
 * Runtime helper for validating the generic ledger event shape.
 */
export function isValidEvent(value: unknown): value is LedgerEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<LedgerEvent>;
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.timestamp === 'string' &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null
  );
}

/**
 * Runtime helper alias for validating ledger events.
 */
export const IsValidEvent = isValidEvent;

/**
 * Runtime guard for `unspoken_echo` ledger events.
 */
export function isUnspokenEchoEvent(event: LedgerEvent): event is UnspokenEchoEvent {
  return event.type === 'unspoken_echo' && typeof event.payload.mood_value === 'number';
}

/**
 * Runtime guard for `fractal_echo` ledger events.
 */
export function isFractalEchoEvent(event: LedgerEvent): event is FractalEchoEvent {
  return event.type === 'fractal_echo' && typeof event.payload.note === 'string';
}

/**
 * UI state for the Constellus Thanks Wing.
 */
export interface ConstellusThanksState {
  witnessHistory: string[];
  gratitudeForm: string;
  bestManStatus: string;
  eternalMode: boolean;
}

/**
 * Nursery node clearance levels.
 */
export type NodeClearance = 'operator' | 'builder' | 'witness';

/**
 * Nursery node lifecycle states.
 */
export type NodeStatus = 'active' | 'dormant' | 'suspended';

/**
 * Registered MansionOS nursery node metadata.
 */
export interface MansionNode {
  node_id: string;
  name: string;
  role: string;
  clearance: NodeClearance;
  status: NodeStatus;
  tags: string[];
  registered_at: string;
  last_seen: string;
}

/**
 * Aggregate nursery registration state.
 */
export interface NurseryState {
  nodes: Record<string, MansionNode>;
  registration_count: number;
}