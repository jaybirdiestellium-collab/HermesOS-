/**
 * Unit tests — Constellus Ledger Service (LEDGER_HANDOFF_2026-08-05)
 *
 * Covers:
 *  1. Logger injection
 *  2. queryByTime input validation
 *  3. Cache reset after evolveIfFull
 *  Plus: insert/query baseline, fractal echo gap fill
 *
 * Run: npm run test:ledger
 */

import { LedgerTree, ConstellusLedgerTree } from '../constellusService';
import type { LedgerEvent } from '../../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
  }
}

function assertThrows(fn: () => void, match: string | RegExp, msg: string): void {
  try {
    fn();
    failed++;
    failures.push(`${msg} (expected throw)`);
    console.error(`  ✗ ${msg} (expected throw)`);
  } catch (e) {
    const text = e instanceof Error ? e.message : String(e);
    const ok = typeof match === 'string' ? text.includes(match) : match.test(text);
    assert(ok, msg);
  }
}

function makeEvent(ts: string, type = 'note', extra: Partial<LedgerEvent> = {}): LedgerEvent {
  return { type, timestamp: ts, ...extra };
}

// ── 1. Logger injection ────────────────────────────────────────────────────

console.log('\n[1] Logger injection');
{
  const logs: string[] = [];
  const tree = new ConstellusLedgerTree((msg) => logs.push(msg));
  tree.passiveEchoSniffer(0.75);
  assert(logs.length >= 1, 'passiveEchoSniffer emits via injected logger');
  assert(
    logs.some((m) => m.includes('PASSIVE GIFT') && m.includes('0.75')),
    'passiveEchoSniffer message content correct',
  );

  const logs2: string[] = [];
  const tree2 = new ConstellusLedgerTree((msg) => logs2.push(msg));
  // empty dive → fractal echo + log
  tree2.activeDeepDive(new Date('2026-08-05T12:00:00.000Z'));
  assert(
    logs2.some((m) => m.includes('PROBE PREDICTS GAP') || m.includes('Fractal Echo')),
    'activeDeepDive logs gap fill via logger',
  );
}

// ── 2. Input validation (queryByTime) ──────────────────────────────────────

console.log('\n[2] queryByTime input validation');
{
  const tree = new LedgerTree();
  assertThrows(
    () => tree.queryByTime('2026-08-05T10:00:00.000Z', '2026-08-05T09:00:00.000Z'),
    'Start time cannot be after end time',
    'throws when startISO > endISO',
  );

  // valid range does not throw
  let ok = true;
  try {
    tree.queryByTime('2026-08-05T09:00:00.000Z', '2026-08-05T10:00:00.000Z');
  } catch {
    ok = false;
  }
  assert(ok, 'valid range does not throw');
}

// ── 3. Cache reset after evolveIfFull ──────────────────────────────────────

console.log('\n[3] Cache reset after evolveIfFull');
{
  const logs: string[] = [];
  const tree = new ConstellusLedgerTree((m) => logs.push(m));
  // Insert 15 events so threshold 10 triggers
  for (let i = 0; i < 15; i++) {
    const pad = String(i).padStart(2, '0');
    tree.insert(makeEvent(`2026-08-05T12:00:${pad}.000Z`, 'seed'));
  }
  assert(tree._nodeCount() === 15, 'node count is 15 after inserts');
  const msg = tree.evolveIfFull(10);
  assert(msg.includes('ARCHIVE SEALED') || msg.includes('NEW LEDGER'), 'evolveIfFull seals archive');
  assert(tree._nodeCount() === 0, 'node count reset to 0 after evolution');
  assert(
    logs.some((m) => m.includes('CONSTELLUS EVOLVE') || m.includes('ARCHIVE SEALED')),
    'evolveIfFull logs through injected logger',
  );

  // re-insert works on new branch
  tree.insert(makeEvent('2026-08-05T15:00:00.000Z', 'post_evolve'));
  assert(tree._nodeCount() === 1, 'post-evolution insert increments cache');
}

// ── 4. Baseline insert / query ─────────────────────────────────────────────

console.log('\n[4] Baseline insert & queryByTime');
{
  const tree = new LedgerTree();
  tree.insert(makeEvent('2026-08-05T08:00:00.000Z', 'a'));
  tree.insert(makeEvent('2026-08-05T10:00:00.000Z', 'b'));
  tree.insert(makeEvent('2026-08-05T12:00:00.000Z', 'c'));
  const mid = tree.queryByTime('2026-08-05T09:00:00.000Z', '2026-08-05T11:00:00.000Z');
  assert(mid.length === 1 && mid[0].type === 'b', 'query returns events in range only');
  assert(tree._nodeCount() === 3, 'node count tracks inserts');
}

// ── 5. Constructor backward compatible (no logger) ─────────────────────────

console.log('\n[5] Constructor without logger');
{
  const tree = new ConstellusLedgerTree();
  const log = tree.passiveEchoSniffer(0.1);
  assert(typeof log === 'string' && log.includes('Ledger inserted'), 'works without logger');
  assert(tree._nodeCount() === 1, 'count works without logger');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log('\n────────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.error('Failures:\n' + failures.map((f) => `  - ${f}`).join('\n'));
}
console.log('────────────────────────────────────\n');
process.exit(failed > 0 ? 1 : 0);
