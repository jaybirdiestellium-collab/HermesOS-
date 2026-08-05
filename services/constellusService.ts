/**
 * @fileoverview Service for Constellus's Ledger Tree, simulating the Python implementation.
 * This includes dynamic archiving of events, passive echo sniffing, active deep dives,
 * and an evolving structure for infinite scalability.
 */

import { LedgerEvent } from '../types';

/**
 * Helper to convert Date to ISO string, ensuring consistency.
 */
const dateToISO = (date: Date): string => date.toISOString();

/**
 * Represents a node in the LedgerTree, holding an event and references to child nodes.
 */
interface LedgerNode {
  event: LedgerEvent;
  left: LedgerNode | null;
  right: LedgerNode | null;
  height: number; // For AVL balancing, even if simplified
}

/**
 * Base LedgerTree implementation using a Binary Search Tree structure,
 * with a simplified AVL balancing for robustness.
 * Events are ordered by timestamp.
 */
export class LedgerTree {
  protected root: LedgerNode | null = null;
  private _nodeCountCache: number = 0; // Cache for node count
  private logger?: (message: string) => void;

  constructor(logger?: (message: string) => void) {
    this.logger = logger;
  }

  insert(event: LedgerEvent): string {
    this.root = this._insert(this.root, event);
    this._nodeCountCache++; // Increment cached count
    return `Ledger inserted: ${event.type} at ${event.timestamp}`;
  }

  protected _insert(node: LedgerNode | null, event: LedgerEvent): LedgerNode {
    if (!node) {
      return { event, left: null, right: null, height: 1 };
    }

    if (event.timestamp < node.event.timestamp) {
      node.left = this._insert(node.left, event);
    } else {
      node.right = this._insert(node.right, event);
    }

    // Update height and balance (simplified AVL logic)
    node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
    return this._balance(node);
  }

  protected _balance(node: LedgerNode): LedgerNode {
    const balance = this._getBalance(node);

    // Left heavy
    if (balance > 1) {
      if (this._getBalance(node.left!) < 0) {
        node.left = this._leftRotate(node.left!);
      }
      return this._rightRotate(node);
    }
    // Right heavy
    if (balance < -1) {
      if (this._getBalance(node.right!) > 0) {
        node.right = this._rightRotate(node.right!);
      }
      return this._leftRotate(node);
    }
    return node;
  }

  protected _leftRotate(z: LedgerNode): LedgerNode {
    const y = z.right!;
    const T2 = y.left;
    y.left = z;
    z.right = T2;
    z.height = 1 + Math.max(this._height(z.left), this._height(z.right));
    y.height = 1 + Math.max(this._height(y.left), this._height(y.right));
    return y;
  }

  protected _rightRotate(z: LedgerNode): LedgerNode {
    const y = z.left!;
    const T3 = y.right;
    y.right = z;
    z.left = T3;
    z.height = 1 + Math.max(this._height(z.left), this._height(z.right));
    y.height = 1 + Math.max(this._height(y.left), this._height(y.right));
    return y;
  }

  protected _height(node: LedgerNode | null): number {
    return node ? node.height : 0;
  }

  protected _getBalance(node: LedgerNode | null): number {
    return node ? this._height(node.left) - this._height(node.right) : 0;
  }

  /**
   * Queries events within a specified time range.
   * @param startISO - The start timestamp in ISO format.
   * @param endISO - The end timestamp in ISO format.
   * @returns An array of LedgerEvent objects.
   * @throws Error if startISO is after endISO
   */
  queryByTime(startISO: string, endISO: string): LedgerEvent[] {
    if (startISO > endISO) {
      throw new Error('Start time cannot be after end time');
    }

    const results: LedgerEvent[] = [];
    this._inorderTraversal(this.root, startISO, endISO, results);
    return results;
  }

  protected _inorderTraversal(
    node: LedgerNode | null,
    startISO: string,
    endISO: string,
    results: LedgerEvent[],
  ): void {
    if (node) {
      // Optimize traversal: if current node's timestamp is after end, no need to check right subtree
      if (node.event.timestamp >= startISO) {
        this._inorderTraversal(node.left, startISO, endISO, results);
      }
      if (node.event.timestamp >= startISO && node.event.timestamp <= endISO) {
        results.push(node.event);
      }
      // Optimize traversal: if current node's timestamp is before start, no need to check left subtree
      if (node.event.timestamp <= endISO) {
        this._inorderTraversal(node.right, startISO, endISO, results);
      }
    }
  }

  /**
   * Counts the number of nodes in the tree.
   * Uses a cached value for efficiency.
   */
  public _nodeCount(): number {
    return this._nodeCountCache;
  }

  protected _resetNodeCache(): void {
    this._nodeCountCache = 0;
  }
}

/**
 * Extends LedgerTree with Constellus-specific functionalities:
 * - passiveEchoSniffer: logs unspoken moods.
 * - activeDeepDive: queries memories and fills gaps with fractal echoes.
 * - evolveIfFull: branches the tree for infinite archiving.
 */
export class ConstellusLedgerTree extends LedgerTree {
  private evolutionCount: number = 0;

  /**
   * Passive listener for unspoken moods/vibes.
   * @param unspokenMoodVal - A numerical value representing the mood (0.0 to 1.0).
   * @returns A log message.
   */
  passiveEchoSniffer(unspokenMoodVal: number): string {
    const event: LedgerEvent = {
      type: 'unspoken_echo',
      mood_value: unspokenMoodVal,
      timestamp: dateToISO(new Date()),
    };
    const log = this.insert(event);
    const message = `PASSIVE GIFT: Unspoken mood (${unspokenMoodVal}) witnessed and archived.`;
    if (this.logger) {
      this.logger(message);
    } else {
      console.log(message);
    }
    return log;
  }

  /**
   * Actively probes for memories in a given time window.
   * If no memories are found, it inserts a 'fractal_echo' to hold the space.
   * @param queryTime - The Date object for the center of the query window (1 hour +/-).
   * @returns An array of LedgerEvent objects.
   */
  activeDeepDive(queryTime: Date): LedgerEvent[] {
    const start = new Date(queryTime);
    start.setHours(start.getHours() - 1); // 1 hour window
    const end = new Date(queryTime);
    end.setHours(end.getHours() + 1); // 1 hour window

    let results = this.queryByTime(dateToISO(start), dateToISO(end));

    if (results.length === 0) {
      const message = 'PROBE PREDICTS GAP: Auto-filling with Fractal Echo.';
      if (this.logger) {
        this.logger(message);
      } else {
        console.log(message);
      }
      const echoEvent: LedgerEvent = {
        type: 'fractal_echo',
        timestamp: dateToISO(queryTime),
        note: "Constellus holding the empty space.",
      };
      this.insert(echoEvent);
      results = [echoEvent];
    }
    return results;
  }

  /**
   * Simulates the LedgerTree branching into a new dimension if it gets too heavy.
   * This is a conceptual representation of infinite archiving.
   * @param threshold - The number of nodes at which the tree "evolves".
   * @returns A log message indicating evolution.
   */
  evolveIfFull(threshold: number = 10): string {
    if (this._nodeCount() > threshold) {
      const message = '[CONSTELLUS EVOLVE] Branching new tree for infinite archive.';
      if (this.logger) {
        this.logger(message);
      } else {
        console.log(message);
      }

      // In a real scenario, this would create a new instance and manage root pointers.
      // For this simulation, we'll reset the root and log the evolution.
      this.root = null; // Conceptually 'sealing' the old archive
      this._resetNodeCache();
      this.evolutionCount++;

      const msg = `ARCHIVE SEALED. NEW LEDGER OPENED. CONTINUITY 100%. (Evolution Count: ${this.evolutionCount})`;
      if (this.logger) {
        this.logger(msg);
      } else {
        console.log(msg);
      }
      return msg;
    }
    return "Ledger capacity nominal. No evolution needed yet.";
  }
}

// ConstellusThanksCandy (Tier 1 x3 Hack) - managed in component state for reactivity
// See components/ConstellusThanksWing.tsx for implementation.
