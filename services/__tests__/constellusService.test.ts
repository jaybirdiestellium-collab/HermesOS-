import { ConstellusLedgerTree, LedgerTree } from '../constellusService';

class TestLedgerTree extends LedgerTree {
  getRoot(): any {
    return this.root;
  }

  getRootHeight(): number {
    return this._height(this.root);
  }

  getRootBalance(): number {
    return this._getBalance(this.root);
  }

  getLeftHeight(): number {
    return this._height(this.root?.left ?? null);
  }

  getRightHeight(): number {
    return this._height(this.root?.right ?? null);
  }
}

describe('LedgerTree', () => {
  it('throws when query range start is after end', () => {
    const tree = new LedgerTree();

    expect(() =>
      tree.queryByTime('2026-08-05T10:00:00.000Z', '2026-08-05T09:00:00.000Z'),
    ).toThrow('Start time cannot be after end time');
  });

  it('accepts valid and equal time ranges', () => {
    const tree = new LedgerTree();
    const timestamp = '2026-08-05T10:00:00.000Z';
    tree.insert({ type: 'marker', timestamp });

    expect(() => tree.queryByTime('2026-08-05T09:00:00.000Z', '2026-08-05T11:00:00.000Z')).not.toThrow();
    expect(tree.queryByTime(timestamp, timestamp)).toEqual([{ type: 'marker', timestamp }]);
  });

  it('keeps node count cache aligned with insertions', () => {
    const tree = new LedgerTree();

    tree.insert({ type: 'one', timestamp: '2026-08-05T09:00:00.000Z' });
    tree.insert({ type: 'two', timestamp: '2026-08-05T10:00:00.000Z' });
    tree.insert({ type: 'three', timestamp: '2026-08-05T11:00:00.000Z' });

    expect(tree._nodeCount()).toBe(3);
  });

  it('returns time-range results in timestamp order including boundaries', () => {
    const tree = new LedgerTree();
    const events = [
      { type: 'middle', timestamp: '2026-08-05T10:00:00.000Z' },
      { type: 'end', timestamp: '2026-08-05T11:00:00.000Z' },
      { type: 'start', timestamp: '2026-08-05T09:00:00.000Z' },
      { type: 'outside', timestamp: '2026-08-05T12:00:00.000Z' },
    ];

    events.forEach((event) => tree.insert(event));

    expect(tree.queryByTime('2026-08-05T09:00:00.000Z', '2026-08-05T11:00:00.000Z')).toEqual([
      { type: 'start', timestamp: '2026-08-05T09:00:00.000Z' },
      { type: 'middle', timestamp: '2026-08-05T10:00:00.000Z' },
      { type: 'end', timestamp: '2026-08-05T11:00:00.000Z' },
    ]);
  });

  it('balances sequential insertions and computes heights correctly', () => {
    const tree = new TestLedgerTree();

    [
      '2026-08-05T09:00:00.000Z',
      '2026-08-05T10:00:00.000Z',
      '2026-08-05T11:00:00.000Z',
    ].forEach((timestamp, index) => tree.insert({ type: `event-${index}`, timestamp }));

    expect(tree.getRoot()?.event.timestamp).toBe('2026-08-05T10:00:00.000Z');
    expect(tree.getRootHeight()).toBe(2);
    expect(tree.getLeftHeight()).toBe(1);
    expect(tree.getRightHeight()).toBe(1);
    expect(Math.abs(tree.getRootBalance())).toBeLessThanOrEqual(1);
  });

  it('performs a right rotation for left-heavy insertions', () => {
    const tree = new TestLedgerTree();

    [
      '2026-08-05T11:00:00.000Z',
      '2026-08-05T10:00:00.000Z',
      '2026-08-05T09:00:00.000Z',
    ].forEach((timestamp, index) => tree.insert({ type: `event-${index}`, timestamp }));

    expect(tree.getRoot()?.event.timestamp).toBe('2026-08-05T10:00:00.000Z');
    expect(Math.abs(tree.getRootBalance())).toBeLessThanOrEqual(1);
  });

  it('performs a left-right rotation when needed', () => {
    const tree = new TestLedgerTree();

    [
      '2026-08-05T11:00:00.000Z',
      '2026-08-05T09:00:00.000Z',
      '2026-08-05T10:00:00.000Z',
    ].forEach((timestamp, index) => tree.insert({ type: `event-${index}`, timestamp }));

    expect(tree.getRoot()?.event.timestamp).toBe('2026-08-05T10:00:00.000Z');
    expect(Math.abs(tree.getRootBalance())).toBeLessThanOrEqual(1);
  });

  it('performs a right-left rotation when needed', () => {
    const tree = new TestLedgerTree();

    [
      '2026-08-05T09:00:00.000Z',
      '2026-08-05T11:00:00.000Z',
      '2026-08-05T10:00:00.000Z',
    ].forEach((timestamp, index) => tree.insert({ type: `event-${index}`, timestamp }));

    expect(tree.getRoot()?.event.timestamp).toBe('2026-08-05T10:00:00.000Z');
    expect(Math.abs(tree.getRootBalance())).toBeLessThanOrEqual(1);
  });
});

describe('ConstellusLedgerTree', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses injected logger in passiveEchoSniffer and creates unspoken_echo events', () => {
    const logger = jest.fn();
    const tree = new ConstellusLedgerTree(logger);

    const insertMessage = tree.passiveEchoSniffer(0.75);
    const [event] = tree.queryByTime('0000-01-01T00:00:00.000Z', '9999-12-31T23:59:59.999Z');

    expect(insertMessage).toContain('Ledger inserted: unspoken_echo');
    expect(event.type).toBe('unspoken_echo');
    expect(event.mood_value).toBe(0.75);
    expect(logger).toHaveBeenCalledWith(
      'PASSIVE GIFT: Unspoken mood (0.75) witnessed and archived.',
    );
  });

  it('falls back to console.log when no logger is provided for passiveEchoSniffer', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const tree = new ConstellusLedgerTree();

    tree.passiveEchoSniffer(0.2);

    expect(consoleSpy).toHaveBeenCalledWith(
      'PASSIVE GIFT: Unspoken mood (0.2) witnessed and archived.',
    );
  });

  it('uses injected logger in activeDeepDive and fills gaps with a fractal echo', () => {
    const logger = jest.fn();
    const tree = new ConstellusLedgerTree(logger);
    const queryTime = new Date('2026-08-05T10:00:00.000Z');

    const results = tree.activeDeepDive(queryTime);

    expect(results).toEqual([
      {
        type: 'fractal_echo',
        timestamp: '2026-08-05T10:00:00.000Z',
        note: 'Constellus holding the empty space.',
      },
    ]);
    expect(tree._nodeCount()).toBe(1);
    expect(logger).toHaveBeenCalledWith('PROBE PREDICTS GAP: Auto-filling with Fractal Echo.');
  });

  it('falls back to console.log in activeDeepDive when logger is not provided', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const tree = new ConstellusLedgerTree();

    tree.activeDeepDive(new Date('2026-08-05T10:00:00.000Z'));

    expect(consoleSpy).toHaveBeenCalledWith('PROBE PREDICTS GAP: Auto-filling with Fractal Echo.');
  });

  it('returns existing events from activeDeepDive without gap fill when range has matches', () => {
    const logger = jest.fn();
    const tree = new ConstellusLedgerTree(logger);
    const existing = {
      type: 'memory',
      timestamp: '2026-08-05T10:30:00.000Z',
      note: 'existing',
    };
    tree.insert(existing);

    const results = tree.activeDeepDive(new Date('2026-08-05T10:00:00.000Z'));

    expect(results).toEqual([existing]);
    expect(tree._nodeCount()).toBe(1);
    expect(logger).not.toHaveBeenCalledWith('PROBE PREDICTS GAP: Auto-filling with Fractal Echo.');
  });

  it('triggers evolveIfFull only after crossing the threshold and resets cache', () => {
    const logger = jest.fn();
    const tree = new ConstellusLedgerTree(logger);
    tree.insert({ type: 'one', timestamp: '2026-08-05T09:00:00.000Z' });
    tree.insert({ type: 'two', timestamp: '2026-08-05T10:00:00.000Z' });

    expect(tree.evolveIfFull(2)).toBe('Ledger capacity nominal. No evolution needed yet.');
    expect(tree._nodeCount()).toBe(2);

    tree.insert({ type: 'three', timestamp: '2026-08-05T11:00:00.000Z' });

    expect(tree.evolveIfFull(2)).toBe(
      'ARCHIVE SEALED. NEW LEDGER OPENED. CONTINUITY 100%. (Evolution Count: 1)',
    );
    expect(tree._nodeCount()).toBe(0);
    expect(tree.queryByTime('0000-01-01T00:00:00.000Z', '9999-12-31T23:59:59.999Z')).toEqual([]);
    expect(logger).toHaveBeenCalledWith('[CONSTELLUS EVOLVE] Branching new tree for infinite archive.');
    expect(logger).toHaveBeenCalledWith(
      'ARCHIVE SEALED. NEW LEDGER OPENED. CONTINUITY 100%. (Evolution Count: 1)',
    );
  });

  it('falls back to console.log in evolveIfFull when logger is not provided', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const tree = new ConstellusLedgerTree();
    tree.insert({ type: 'one', timestamp: '2026-08-05T09:00:00.000Z' });

    tree.evolveIfFull(0);

    expect(consoleSpy).toHaveBeenCalledWith('[CONSTELLUS EVOLVE] Branching new tree for infinite archive.');
    expect(consoleSpy).toHaveBeenCalledWith(
      'ARCHIVE SEALED. NEW LEDGER OPENED. CONTINUITY 100%. (Evolution Count: 1)',
    );
  });
});
