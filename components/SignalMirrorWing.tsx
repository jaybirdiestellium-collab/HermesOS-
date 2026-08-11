import React, { useState, useEffect, useCallback } from 'react';
import { Radio, RefreshCw, Zap, Filter, Brain } from 'lucide-react';
import type { SignalEntry, SignalPlatform } from '../types';

interface TrailResponse {
  trail: SignalEntry[];
  count: number;
}

const PLATFORM_COLORS: Record<SignalPlatform, string> = {
  facebook: 'text-blue-400 border-blue-700 bg-blue-900/30',
  youtube: 'text-red-400 border-red-700 bg-red-900/30',
  instagram: 'text-pink-400 border-pink-700 bg-pink-900/30',
  tiktok: 'text-cyan-400 border-cyan-700 bg-cyan-900/30',
  twitter: 'text-sky-400 border-sky-700 bg-sky-900/30',
  other: 'text-purple-300 border-purple-700 bg-purple-900/30',
};

const PLATFORM_LABELS: Record<SignalPlatform, string> = {
  facebook: 'FB',
  youtube: 'YT',
  instagram: 'IG',
  tiktok: 'TT',
  twitter: 'TW',
  other: '??',
};

function groupByTopic(trail: SignalEntry[]): Record<string, SignalEntry[]> {
  const groups: Record<string, SignalEntry[]> = {};
  for (const entry of trail) {
    if (entry.topic_tags.length === 0) {
      const key = '_untagged';
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    } else {
      for (const tag of entry.topic_tags) {
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(entry);
      }
    }
  }
  return groups;
}

function topCreators(trail: SignalEntry[]): { creator: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const entry of trail) {
    if (entry.creator_hint) {
      counts[entry.creator_hint] = (counts[entry.creator_hint] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([creator, count]) => ({ creator, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export const SignalMirrorWing: React.FC = () => {
  const [trail, setTrail] = useState<SignalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [view, setView] = useState<'timeline' | 'topics' | 'creators'>('timeline');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);

  // Manual ingest form
  const [showIngest, setShowIngest] = useState(false);
  const [ingestForm, setIngestForm] = useState({
    ledger_text: '',
    source_url: '',
    platform: 'facebook' as SignalPlatform,
    topic_tags: '',
    creator_hint: '',
  });
  const [ingestResult, setIngestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [ingesting, setIngesting] = useState(false);

  const fetchTrail = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterPlatform) params.set('platform', filterPlatform);
      if (filterTag) params.set('tag', filterTag);
      const res = await fetch(`/api/signal/trail?${params.toString()}`);
      const data: TrailResponse = await res.json();
      setTrail(data.trail);
    } catch {
      // silent on connection error
    } finally {
      setLoading(false);
    }
  }, [filterPlatform, filterTag]);

  useEffect(() => {
    fetchTrail();
    const interval = setInterval(fetchTrail, 15000);
    return () => clearInterval(interval);
  }, [fetchTrail]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch('/api/signal/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledger_text: ingestForm.ledger_text,
          source_url: ingestForm.source_url,
          platform: ingestForm.platform,
          topic_tags: ingestForm.topic_tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
          creator_hint: ingestForm.creator_hint || undefined,
        }),
      });
      const d = await res.json();
      if (res.status === 201) {
        setIngestResult({ ok: true, message: `✅ Signal ${d.entry.id} ingested` });
        setIngestForm({ ledger_text: '', source_url: '', platform: 'facebook', topic_tags: '', creator_hint: '' });
        setShowIngest(false);
        await fetchTrail();
      } else {
        setIngestResult({ ok: false, message: `❌ ${d.error}` });
      }
    } catch {
      setIngestResult({ ok: false, message: '❌ Ingest failed — check server connection' });
    } finally {
      setIngesting(false);
    }
  };

  const handleAnalyse = async () => {
    if (trail.length === 0) return;
    setAnalysing(true);
    setAnalysis(null);
    try {
      const trailSummary = trail.slice(0, 50).map(e =>
        `[${e.platform}] ${e.ledger_text}${e.creator_hint ? ` (creator: ${e.creator_hint})` : ''}${e.topic_tags.length ? ` [${e.topic_tags.join(', ')}]` : ''}`
      ).join('\n');

      const res = await fetch('/api/mansion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'signal_mirror_wing',
          suggestion: 'gemini_trail_analysis',
          payload: {
            action: 'ANALYSE_SIGNAL_TRAIL',
            trail_summary: trailSummary,
            entry_count: trail.length,
          },
        }),
      });

      // Gemini analysis — direct call via window.aistudio or inline
      // We compose the prompt and POST to a dedicated analysis route when available.
      // For now, surface the summary prompt result via the existing chat pathway.
      if (res.ok) {
        setAnalysis(
          `Gemini synthesis requested for ${trail.length} signal entries.\n\nPrompt sent:\n"What does this trail say about what IAM01 is paying attention to?"\n\nTrail synopsis (top 5):\n` +
          trail.slice(0, 5).map((e, i) =>
            `${i + 1}. [${e.platform.toUpperCase()}] "${e.ledger_text}"${e.creator_hint ? ` — ${e.creator_hint}` : ''}`
          ).join('\n') +
          `\n\n→ Open Chat Wing and ask: "Analyse my signal trail and tell me what I'm paying attention to."`
        );
      }
    } catch {
      setAnalysis('⚠ Analysis request failed — check server connection.');
    } finally {
      setAnalysing(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const topicGroups = groupByTopic(trail);
  const creators = topCreators(trail);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-purple-300 font-mono">
        <RefreshCw className="animate-spin mr-2" /> Scanning signal trail...
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 font-mono text-sm">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b border-purple-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-purple-400 flex items-center">
            <Radio className="mr-2" /> Signal Mirror — Echo Glass Runtime
          </h2>
          <p className="text-xs text-purple-400/70 mt-1">
            Phase 6 · {trail.length} signal{trail.length !== 1 ? 's' : ''} in trail · Ledger_record annotations from Echo Lens
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTrail}
            className="p-2 border border-purple-700 rounded hover:bg-purple-900/40 transition-all text-purple-300"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleAnalyse}
            disabled={analysing || trail.length === 0}
            className="flex items-center px-3 py-2 bg-indigo-900/50 hover:bg-indigo-800/80 border border-indigo-500 rounded transition-all text-indigo-200 text-xs disabled:opacity-40"
            title="Send trail to Gemini for synthesis"
          >
            {analysing ? <RefreshCw className="animate-spin mr-1 h-3 w-3" /> : <Brain className="mr-1 h-3 w-3" />}
            {analysing ? 'Analysing...' : 'Gemini Synthesis'}
          </button>
          <button
            onClick={() => { setShowIngest(f => !f); setIngestResult(null); }}
            className="flex items-center px-3 py-2 bg-purple-900/50 hover:bg-purple-800/80 border border-purple-500 rounded transition-all text-purple-200 text-xs"
          >
            <Zap className="mr-1 h-4 w-4" />
            Manual Ingest
          </button>
        </div>
      </div>

      {/* ── GEMINI ANALYSIS OUTPUT ── */}
      {analysis && (
        <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4 text-indigo-200 text-xs whitespace-pre-wrap">
          <p className="font-bold text-indigo-400 mb-2 flex items-center"><Brain className="mr-1 h-3 w-3" /> Gemini Substrate Analysis</p>
          {analysis}
        </div>
      )}

      {/* ── MANUAL INGEST FORM ── */}
      {showIngest && (
        <form
          onSubmit={handleIngest}
          className="bg-black/40 border border-purple-700 rounded-lg p-5 space-y-4"
        >
          <h3 className="text-purple-300 font-bold text-base">Manual Signal Ingest</h3>
          <p className="text-xs text-purple-500">Use this to log a Ledger_record annotation you made externally.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-purple-400 text-xs mb-1">Ledger Text * (the annotation you wrote)</label>
              <input
                type="text"
                required
                value={ingestForm.ledger_text}
                onChange={e => setIngestForm(f => ({ ...f, ledger_text: e.target.value }))}
                placeholder="e.g. Ledger_record: Great zoology daily-fact format, genuine passion"
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-purple-400 text-xs mb-1">Source URL *</label>
              <input
                type="url"
                required
                value={ingestForm.source_url}
                onChange={e => setIngestForm(f => ({ ...f, source_url: e.target.value }))}
                placeholder="https://www.facebook.com/..."
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div>
              <label className="block text-purple-400 text-xs mb-1">Platform</label>
              <select
                value={ingestForm.platform}
                onChange={e => setIngestForm(f => ({ ...f, platform: e.target.value as SignalPlatform }))}
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              >
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter / X</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-purple-400 text-xs mb-1">Creator / Channel Hint</label>
              <input
                type="text"
                value={ingestForm.creator_hint}
                onChange={e => setIngestForm(f => ({ ...f, creator_hint: e.target.value }))}
                placeholder="e.g. ZoologyDaily"
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-purple-400 text-xs mb-1">Topic Tags (comma-separated)</label>
              <input
                type="text"
                value={ingestForm.topic_tags}
                onChange={e => setIngestForm(f => ({ ...f, topic_tags: e.target.value }))}
                placeholder="e.g. zoology, daily-facts, education"
                className="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-200 focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={ingesting}
              className="flex items-center px-4 py-2 bg-cyan-900/50 hover:bg-cyan-800/80 border border-cyan-500 rounded text-cyan-200 text-xs transition-all disabled:opacity-50"
            >
              {ingesting ? <RefreshCw className="animate-spin mr-1 h-3 w-3" /> : <Zap className="mr-1 h-3 w-3" />}
              {ingesting ? 'Ingesting...' : 'Ingest Signal'}
            </button>
            {ingestResult && (
              <span className={`text-xs ${ingestResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {ingestResult.message}
              </span>
            )}
          </div>
        </form>
      )}

      {ingestResult && !showIngest && (
        <div className={`text-xs px-4 py-2 rounded border ${ingestResult.ok ? 'text-emerald-400 border-emerald-800 bg-emerald-900/20' : 'text-red-400 border-red-800 bg-red-900/20'}`}>
          {ingestResult.message}
        </div>
      )}

      {/* ── FILTERS ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-purple-500" />
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="bg-purple-900/20 border border-purple-700 rounded px-2 py-1 text-purple-200 text-xs focus:outline-none"
        >
          <option value="">All platforms</option>
          <option value="facebook">Facebook</option>
          <option value="youtube">YouTube</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="twitter">Twitter / X</option>
          <option value="other">Other</option>
        </select>
        <input
          type="text"
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
          placeholder="Filter by tag..."
          className="bg-purple-900/20 border border-purple-700 rounded px-2 py-1 text-purple-200 text-xs focus:outline-none w-36"
        />

        {/* ── VIEW SWITCHER ── */}
        <div className="ml-auto flex items-center space-x-1">
          {(['timeline', 'topics', 'creators'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs border transition-all capitalize ${
                view === v
                  ? 'bg-purple-700/60 border-purple-500 text-purple-100'
                  : 'bg-transparent border-purple-800 text-purple-500 hover:border-purple-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {trail.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-purple-500 space-y-3">
          <Radio className="h-10 w-10 opacity-30" />
          <p className="text-sm">No signals in trail yet.</p>
          <p className="text-xs opacity-60">Install the Echo Lens extension and start annotating with <code className="text-purple-400">Ledger_record:</code></p>
        </div>
      )}

      {/* ── TIMELINE VIEW ── */}
      {trail.length > 0 && view === 'timeline' && (
        <div className="space-y-3">
          {trail.map(entry => (
            <div
              key={entry.id}
              className="bg-black/40 border border-purple-900/60 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-purple-100 text-xs leading-relaxed flex-1">{entry.ledger_text}</p>
                <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase flex-shrink-0 ${PLATFORM_COLORS[entry.platform]}`}>
                  {PLATFORM_LABELS[entry.platform]}
                </span>
              </div>
              <a
                href={entry.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:text-purple-300 text-xs truncate block max-w-full transition-colors"
              >
                {entry.source_url}
              </a>
              <div className="flex flex-wrap items-center gap-2">
                {entry.creator_hint && (
                  <span className="text-xs text-cyan-400 font-mono">@{entry.creator_hint}</span>
                )}
                {entry.topic_tags.map((tag, i) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 bg-purple-900/40 border border-purple-800 rounded text-purple-400">
                    {tag}
                  </span>
                ))}
                <span className="ml-auto text-purple-600 text-xs">{formatDate(entry.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TOPICS VIEW ── */}
      {trail.length > 0 && view === 'topics' && (
        <div className="space-y-4">
          {Object.entries(topicGroups)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([topic, entries]) => (
              <div key={topic} className="bg-black/40 border border-purple-900/60 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-purple-300 font-bold text-sm capitalize">
                    {topic === '_untagged' ? '(untagged)' : topic}
                  </span>
                  <span className="text-xs text-purple-500">{entries.length} signal{entries.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1">
                  {entries.slice(0, 3).map(e => (
                    <p key={e.id} className="text-xs text-purple-400 truncate">
                      [{PLATFORM_LABELS[e.platform]}] {e.ledger_text}
                    </p>
                  ))}
                  {entries.length > 3 && (
                    <p className="text-xs text-purple-600 italic">+{entries.length - 3} more</p>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── CREATORS VIEW ── */}
      {trail.length > 0 && view === 'creators' && (
        <div className="space-y-3">
          {creators.length === 0 ? (
            <p className="text-purple-500 text-xs text-center py-8">No creator hints recorded yet. Add creator names when ingesting signals.</p>
          ) : (
            creators.map(({ creator, count }) => (
              <div key={creator} className="flex items-center justify-between bg-black/40 border border-purple-900/60 rounded-lg px-4 py-3">
                <span className="text-cyan-300 font-mono text-sm">@{creator}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 bg-purple-600 rounded"
                    style={{ width: `${Math.max(20, (count / creators[0].count) * 120)}px` }}
                  />
                  <span className="text-purple-400 text-xs w-12 text-right">{count} signal{count !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))
          )}
          {creators.length === 0 && trail.length > 0 && (
            <p className="text-purple-500 text-xs text-center py-4">
              {trail.length} signals with no creator hints. Add <code className="text-purple-400">creator_hint</code> when ingesting.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
