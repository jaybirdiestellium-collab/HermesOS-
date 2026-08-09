import { LedgerTree, ConstellusLedgerTree } from '../constellusService';
import type { UnspokenEchoEvent } from '../../types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: unknown, message: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

function assertThrows(fn: () => void, expected: string, message: string): void {
  try {
    fn();
    assert(false, `${message} (expected throw)`);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assert(text.includes(expected), message);
  }
}

function makeEvent(timestamp: string, moodValue = 0.5): UnspokenEchoEvent {
  return {
    type: 'unspoken_echo',
    timestamp,
    payload: { mood_value: moodValue },
  };
}

console.log('\n[1] Logger injection');
{
  const logs: string[] = [];
  const tree = new ConstellusLedgerTree((message) => logs.push(message));
  tree.passiveEchoSniffer(0.75);
  assert(
    logs.some((message) => message.includes('PASSIVE GIFT') && message.includes('0.75')),
    'passiveEchoSniffer uses the injected logger',
  );

  const gapLogs: string[] = [];
  const gapTree = new ConstellusLedgerTree((message) => gapLogs.push(message));
  gapTree.activeDeepDive(new Date('2026-08-05T12:00:00.000Z'));
  assert(
    gapLogs.some((message) => message.includes('PROBE PREDICTS GAP')),
    'activeDeepDive uses the injected logger',
  );
}

console.log('\n[2] queryByTime validation');
{
  const tree = new LedgerTree();
  assertThrows(
    () => tree.queryByTime('2026-08-05T10:00:00.000Z', '2026-08-05T09:00:00.000Z'),
    'Start time cannot be after end time',
    'rejects a reversed time range',
  );
  assert(
    tree.queryByTime('2026-08-05T09:00:00.000Z', '2026-08-05T10:00:00.000Z').length === 0,
    'accepts a valid time range',
  );
}

console.log('\n[3] Cache reset after evolution');
{
  const logs: string[] = [];
  const tree = new ConstellusLedgerTree((message) => logs.push(message));
  for (let index = 0; index < 15; index++) {
    const seconds = String(index).padStart(2, '0');
    tree.insert(makeEvent(`2026-08-05T12:00:${seconds}.000Z`, index / 15));
  }
  assert(tree._nodeCount() === 15, 'tracks inserted nodes');
  const result = tree.evolveIfFull(10);
  assert(result.includes('ARCHIVE SEALED'), 'seals a full archive');
  assert(tree._nodeCount() === 0, 'resets the node count after evolution');
  assert(
    logs.some((message) => message.includes('CONSTELLUS EVOLVE')),
    'evolveIfFull uses the injected logger',
  );
}

console.log('\n[4] Typed insert and range query');
{
  const tree = new LedgerTree();
  tree.insert(makeEvent('2026-08-05T08:00:00.000Z', 0.1));
  tree.insert(makeEvent('2026-08-05T10:00:00.000Z', 0.2));
  tree.insert(makeEvent('2026-08-05T12:00:00.000Z', 0.3));
  const results = tree.queryByTime(
    '2026-08-05T09:00:00.000Z',
    '2026-08-05T11:00:00.000Z',
  );
  assert(
    results.length === 1 && results[0].timestamp === '2026-08-05T10:00:00.000Z',
    'returns only typed events in the requested range',
  );
  assert(tree._nodeCount() === 3, 'preserves the node count after querying');
}

console.log('\n[5] Backward-compatible constructor');
{
  const tree = new ConstellusLedgerTree();
  const result = tree.passiveEchoSniffer(0.1);
  assert(result.includes('Ledger inserted'), 'works without an injected logger');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.error(failures.map((failure) => `  - ${failure}`).join('\n'));
}
process.exit(failed > 0 ? 1 : 0);
